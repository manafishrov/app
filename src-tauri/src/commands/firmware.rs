use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::Deserialize;
use tauri::async_runtime::spawn_blocking;
use tauri::{AppHandle, Emitter, State, command};

use crate::firmware::{
  FirmwareDownloadRequest, FirmwareManifestRequest, FirmwareReleaseManifest, FlashDrive,
  FlashStatus, download_firmware, fetch_manifest, list_drives, parse_status_line,
};

const FLASH_PROGRESS_EVENT: &str = "firmware_flash_progress";

#[derive(Default)]
pub struct FlashControl {
  pub cancel_flag_path: Mutex<Option<std::path::PathBuf>>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartFlashRequest {
  pub image_path: String,
  pub device: String,
  pub image_size: u64,
  pub verify: bool,
}

#[command]
/// # Errors
/// Returns an error if the manifest cannot be fetched, verified, or parsed.
pub async fn check_firmware_update(
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
/// Returns an error if drive enumeration fails or is not implemented for the platform.
pub fn list_flash_drives() -> Result<Vec<FlashDrive>, String> {
  list_drives()
}

fn current_binary_path() -> Result<std::path::PathBuf, String> {
  std::env::current_exe().map_err(|e| format!("Could not resolve current binary: {e}"))
}

fn watch_status_file(app: AppHandle, status_path: std::path::PathBuf) {
  use std::io::{BufRead, BufReader, Seek, SeekFrom};

  let mut offset: u64 = 0;
  loop {
    let Ok(mut file) = std::fs::OpenOptions::new().read(true).open(&status_path) else {
      std::thread::sleep(Duration::from_millis(200));
      continue;
    };
    if file.seek(SeekFrom::Start(offset)).is_err() {
      break;
    }
    let mut reader = BufReader::new(&mut file);
    let mut buffer = String::new();
    let mut done = false;
    loop {
      buffer.clear();
      match reader.read_line(&mut buffer) {
        Ok(0) => break,
        Ok(_) => {
          if let Some(status) = parse_status_line(&buffer) {
            let payload = serde_json::to_value(&status).ok();
            if let Some(payload) = payload {
              let _ = app.emit(FLASH_PROGRESS_EVENT, payload);
            }
            if matches!(status, FlashStatus::Completed | FlashStatus::Error { .. }) {
              done = true;
              break;
            }
          }
        },
        Err(_) => break,
      }
    }
    let position = file.stream_position().unwrap_or(offset);
    offset = position;
    if done {
      break;
    }
    std::thread::sleep(Duration::from_millis(200));
  }
}

#[command]
/// # Errors
/// Returns an error if the elevated flasher subprocess cannot be spawned or
/// fails during execution.
pub async fn start_flash(
  app: AppHandle,
  state: State<'_, Arc<FlashControl>>,
  payload: StartFlashRequest,
) -> Result<(), String> {
  let binary = current_binary_path()?;
  let temp_dir = std::env::temp_dir().join("manafish-flasher");
  std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;
  let status_file = temp_dir.join(format!("status-{}.jsonl", std::process::id()));
  let cancel_file = temp_dir.join(format!("cancel-{}.flag", std::process::id()));
  let _ = std::fs::remove_file(&status_file);
  let _ = std::fs::remove_file(&cancel_file);

  if let Ok(mut guard) = state.cancel_flag_path.lock() {
    *guard = Some(cancel_file.clone());
  }

  let watcher_app = app.clone();
  let watcher_status = status_file.clone();
  let watcher_handle = spawn_blocking(move || watch_status_file(watcher_app, watcher_status));

  let device = payload.device.clone();
  let image = payload.image_path.clone();
  let image_size = payload.image_size;
  let verify = payload.verify;
  let status_arg = status_file.display().to_string();

  let exit_status = spawn_blocking(move || {
    runas::Command::new(binary)
      .args(&[
        "--flash".to_string(),
        format!("--image={image}"),
        format!("--device={device}"),
        format!("--status-file={status_arg}"),
        format!("--image-size={image_size}"),
        format!("--verify={verify}"),
      ])
      .gui(true)
      .show(false)
      .status()
  })
  .await
  .map_err(|e| format!("Flasher join failed: {e}"))?
  .map_err(|e| format!("Flasher spawn failed: {e}"))?;

  let _ = watcher_handle.await;

  if !exit_status.success() {
    let code = exit_status.code().unwrap_or(-1);
    return Err(format!("Flasher exited with code {code}"));
  }
  Ok(())
}

#[command]
/// # Errors
/// Returns an error if the cancel sentinel file cannot be written.
pub fn cancel_flash(state: State<'_, Arc<FlashControl>>) -> Result<(), String> {
  let path = state.cancel_flag_path.lock().map_err(|e| e.to_string())?.clone();
  if let Some(path) = path {
    std::fs::write(&path, b"cancel").map_err(|e| e.to_string())?;
  }
  Ok(())
}
