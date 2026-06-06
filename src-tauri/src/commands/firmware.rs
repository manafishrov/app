use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Deserialize;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter, State, command};

use serde::Serialize;

use crate::firmware::{
  FirmwareDownloadRequest, FirmwareManifestRequest, FirmwareRelease, FirmwareReleaseManifest,
  FirmwareReleasesRequest, FlashDrive, FlashStatus, cleanup_cache, download_firmware,
  fetch_manifest, fetch_releases, list_drives, parse_status_line,
};
use crate::{log_error, log_info, log_warn};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct FlashProgressEvent {
  phase: String,
  bytes_written: u64,
  total_bytes: u64,
  bytes_per_second: u64,
  message: Option<String>,
}

use crate::firmware::constants::FLASH_PROGRESS_EVENT;

#[derive(Default)]
pub struct FlashControl {
  pub cancel_flag_path: Mutex<Option<std::path::PathBuf>>,
  pub signal_file_path: Mutex<Option<std::path::PathBuf>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepareFlashRequest {
  pub device: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalFlashImageRequest {
  pub image_path: String,
  pub image_size: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupFirmwareCacheRequest {
  pub keep_file_name: Option<String>,
}

#[command]
/// # Errors
/// Returns an error if the `GitHub` releases cannot be fetched or parsed.
pub async fn list_firmware_releases(
  payload: FirmwareReleasesRequest,
) -> Result<Vec<FirmwareRelease>, String> {
  fetch_releases(&payload.repo_url).await
}

#[command]
/// # Errors
/// Returns an error if the manifest cannot be fetched, verified, or parsed.
pub async fn fetch_firmware_manifest(
  payload: FirmwareManifestRequest,
) -> Result<FirmwareReleaseManifest, String> {
  fetch_manifest(&payload.manifest_url).await
}

#[command]
/// # Errors
/// Returns an error if the firmware artifact cannot be downloaded or verified.
pub async fn download_firmware_update(
  app: AppHandle,
  payload: FirmwareDownloadRequest,
) -> Result<String, String> {
  let path = download_firmware(&app, payload).await?;
  Ok(path.display().to_string())
}

#[command]
/// # Errors
/// Returns an error if the firmware cache directory cannot be cleaned.
pub fn cleanup_firmware_cache(payload: CleanupFirmwareCacheRequest) -> Result<(), String> {
  cleanup_cache(payload.keep_file_name)
}

#[command]
/// # Errors
/// Returns an error if drive enumeration fails or is not implemented for the platform.
pub fn list_flash_drives() -> Result<Vec<FlashDrive>, String> {
  list_drives()
}

impl From<&FlashStatus> for FlashProgressEvent {
  fn from(status: &FlashStatus) -> Self {
    match status {
      FlashStatus::WaitingForImage => Self {
        phase: "waitingForImage".to_string(),
        bytes_written: 0,
        total_bytes: 0,
        bytes_per_second: 0,
        message: None,
      },
      FlashStatus::Starting => Self {
        phase: "starting".to_string(),
        bytes_written: 0,
        total_bytes: 0,
        bytes_per_second: 0,
        message: None,
      },
      FlashStatus::Decompressing {
        bytes_processed,
        total_bytes,
      } => Self {
        phase: "decompressing".to_string(),
        bytes_written: *bytes_processed,
        total_bytes: *total_bytes,
        bytes_per_second: 0,
        message: None,
      },
      FlashStatus::Flashing {
        bytes_written,
        total_bytes,
        bytes_per_second,
      } => Self {
        phase: "flashing".to_string(),
        bytes_written: *bytes_written,
        total_bytes: *total_bytes,
        bytes_per_second: *bytes_per_second,
        message: None,
      },
      FlashStatus::Verifying {
        bytes_verified,
        total_bytes,
      } => Self {
        phase: "verifying".to_string(),
        bytes_written: *bytes_verified,
        total_bytes: *total_bytes,
        bytes_per_second: 0,
        message: None,
      },
      FlashStatus::Completed => Self {
        phase: "completed".to_string(),
        bytes_written: 0,
        total_bytes: 0,
        bytes_per_second: 0,
        message: None,
      },
      FlashStatus::Error { message } => Self {
        phase: "error".to_string(),
        bytes_written: 0,
        total_bytes: 0,
        bytes_per_second: 0,
        message: Some(message.clone()),
      },
    }
  }
}

/// # Errors
///
/// Returns an error if the current application binary path cannot be resolved.
fn current_binary_path() -> Result<std::path::PathBuf, String> {
  std::env::current_exe().map_err(|e| format!("Could not resolve current binary: {e}"))
}

/// Directory used for the status/cancel/signal coordination files shared
/// between the app and the (possibly elevated) flasher subprocess.
fn flasher_temp_dir() -> std::path::PathBuf {
  std::env::temp_dir().join("manafish-flasher")
}

/// Fail with an actionable error if the elevation launcher is missing, rather
/// than hanging. A packaged GUI app has no terminal, so `pkexec` is required.
///
/// # Errors
///
/// Returns an error describing the missing launcher and how to install it.
#[cfg(target_os = "linux")]
fn ensure_elevation_available() -> Result<(), String> {
  if which_in_path("pkexec").is_some() {
    return Ok(());
  }
  Err(
    "Cannot elevate privileges to flash: `pkexec` was not found. Flashing requires polkit \
     (PolicyKit) with a running authentication agent. Install the `polkit` package and ensure \
     a polkit authentication agent is running for your desktop session, then try again."
      .to_string(),
  )
}

#[cfg(target_os = "linux")]
fn which_in_path(program: &str) -> Option<std::path::PathBuf> {
  let path_var = std::env::var_os("PATH")?;
  for dir in std::env::split_paths(&path_var) {
    let candidate = dir.join(program);
    if candidate.is_file() {
      return Some(candidate);
    }
  }
  None
}

/// Spawn the flasher subprocess with elevated privileges (Linux).
///
/// Uses `pkexec` so the user gets a graphical polkit authentication dialog.
/// polkit resets the environment for the elevated process, so the dynamic
/// library search paths the binary relies on are forwarded explicitly by
/// invoking the binary through `env VAR=value ...`.
///
/// # Errors
///
/// Returns an error if the elevated process cannot be spawned or waited on.
#[cfg(target_os = "linux")]
fn spawn_elevated_flasher(
  binary: &std::path::Path,
  flasher_args: &[String],
) -> Result<std::process::ExitStatus, std::io::Error> {
  // Library paths the elevated process needs (injected via the env).
  const FORWARDED_ENV_VARS: [&str; 2] = ["LD_LIBRARY_PATH", "GST_PLUGIN_SYSTEM_PATH_1_0"];

  let mut command = std::process::Command::new("pkexec");
  // `env` forwards them despite pkexec sanitising the inherited environment.
  command.arg("env");
  for var in FORWARDED_ENV_VARS {
    if let Ok(value) = std::env::var(var)
      && !value.is_empty()
    {
      command.arg(format!("{var}={value}"));
    }
  }
  command.arg(binary).args(flasher_args).status()
}

/// Spawn the elevated flasher via the `runas` native elevation dialog.
///
/// # Errors
///
/// Returns an error if the elevated process cannot be spawned or waited on.
#[cfg(not(target_os = "linux"))]
fn spawn_elevated_flasher(
  binary: &std::path::Path,
  flasher_args: &[String],
) -> Result<std::process::ExitStatus, std::io::Error> {
  runas::Command::new(binary).args(flasher_args).gui(true).show(false).status()
}

fn watch_status_file(app: &AppHandle, status_path: &std::path::Path) {
  use std::io::{BufRead, BufReader, Seek, SeekFrom};

  log_info!("Flash status watcher started for {}", status_path.display());
  let mut offset: u64 = 0;
  loop {
    let Ok(mut file) = std::fs::OpenOptions::new().read(true).open(status_path) else {
      std::thread::sleep(Duration::from_millis(200));
      continue;
    };
    if file.seek(SeekFrom::Start(offset)).is_err() {
      log_warn!("Flash status watcher seek failed, exiting");
      break;
    }
    let mut reader = BufReader::new(&mut file);
    let mut buffer = String::new();
    let mut done = false;
    loop {
      buffer.clear();
      match reader.read_line(&mut buffer) {
        Ok(0) | Err(_) => break,
        Ok(_) => {
          if let Some(status) = parse_status_line(&buffer) {
            let event = FlashProgressEvent::from(&status);
            if let Err(emit_err) = app.emit(FLASH_PROGRESS_EVENT, &event) {
              log_error!("Flash status watcher emit failed: {emit_err}");
            }
            if matches!(status, FlashStatus::Completed | FlashStatus::Error { .. }) {
              done = true;
              break;
            }
          }
        },
      }
    }
    let position = file.stream_position().unwrap_or(offset);
    offset = position;
    if done {
      log_info!("Flash status watcher finished");
      break;
    }
    std::thread::sleep(Duration::from_millis(200));
  }
}

#[command]
/// # Errors
/// Returns an error if the elevated flasher subprocess cannot be spawned or
/// the device cannot be opened.
pub async fn prepare_flash(
  app: AppHandle,
  state: State<'_, Arc<FlashControl>>,
  payload: PrepareFlashRequest,
) -> Result<(), String> {
  #[cfg(target_os = "linux")]
  ensure_elevation_available()?;

  let binary = current_binary_path()?;
  let temp_dir = flasher_temp_dir();
  std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
  let pid = std::process::id();
  let status_file = temp_dir.join(format!("status-{pid}.jsonl"));
  let cancel_file = temp_dir.join(format!("cancel-{pid}.flag"));
  let signal_file = temp_dir.join(format!("signal-{pid}.json"));
  let _ = std::fs::remove_file(&status_file);
  let _ = std::fs::remove_file(&cancel_file);
  let _ = std::fs::remove_file(&signal_file);

  if let Ok(mut guard) = state.cancel_flag_path.lock() {
    *guard = Some(cancel_file.clone());
  }
  if let Ok(mut guard) = state.signal_file_path.lock() {
    *guard = Some(signal_file.clone());
  }

  let watcher_app = app.clone();
  let watcher_status = status_file.clone();
  tauri::async_runtime::spawn(async move {
    spawn_blocking(move || watch_status_file(&watcher_app, &watcher_status))
      .await
      .ok();
  });

  let device = payload.device.clone();
  let status_arg = status_file.display().to_string();
  let signal_arg = signal_file.display().to_string();

  spawn_blocking(move || {
    log_info!("Spawning elevated flash subprocess for device {device}");
    let flasher_args = [
      "--flash".to_string(),
      format!("--device={device}"),
      format!("--status-file={status_arg}"),
      format!("--wait-for-signal={signal_arg}"),
    ];
    let result = spawn_elevated_flasher(&binary, &flasher_args);
    match &result {
      Ok(exit_status) => log_info!("Flash subprocess exited with {exit_status}"),
      Err(error) => log_error!("Flash subprocess spawn failed: {error}"),
    }
  });

  wait_for_status(&status_file).await
}

/// # Errors
///
/// Returns an error if the flasher never reports readiness, reports a flash
/// error, or the blocking task cannot be joined.
async fn wait_for_status(status_file: &std::path::Path) -> Result<(), String> {
  let path = status_file.to_path_buf();
  spawn_blocking(move || {
    for _ in 0..150_u32 {
      std::thread::sleep(Duration::from_millis(200));
      if let Ok(contents) = std::fs::read_to_string(&path) {
        for line in contents.lines().rev() {
          if let Some(status) = parse_status_line(line) {
            if matches!(status, FlashStatus::WaitingForImage) {
              return Ok(());
            }
            if let FlashStatus::Error { message } = status {
              return Err(message);
            }
          }
        }
      }
    }
    Err("Timed out waiting for elevated flasher to be ready".to_string())
  })
  .await
  .map_err(|e| e.to_string())?
}

#[command]
/// # Errors
/// Returns an error if the signal file cannot be written.
#[allow(clippy::needless_pass_by_value)] // Tauri command state extractors are passed by value.
pub fn signal_flash_image(
  state: State<'_, Arc<FlashControl>>,
  payload: SignalFlashImageRequest,
) -> Result<(), String> {
  let signal_path = state
    .signal_file_path
    .lock()
    .map_err(|e| e.to_string())?
    .clone()
    .ok_or_else(|| "No flash session prepared".to_string())?;
  let signal = crate::firmware::status::FlashSignal {
    image: payload.image_path,
    image_size: payload.image_size,
  };
  let json = serde_json::to_string(&signal).map_err(|e| e.to_string())?;
  std::fs::write(&signal_path, json).map_err(|e| e.to_string())
}

#[command]
/// # Errors
/// Returns an error if the cancel sentinel file cannot be written.
#[allow(clippy::needless_pass_by_value)] // Tauri command state extractors are passed by value.
pub fn cancel_flash(state: State<'_, Arc<FlashControl>>) -> Result<(), String> {
  let path = state.cancel_flag_path.lock().map_err(|e| e.to_string())?.clone();
  if let Some(path) = path {
    std::fs::write(&path, b"cancel").map_err(|e| e.to_string())?;
  }
  Ok(())
}
