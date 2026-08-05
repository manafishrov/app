mod commands;
mod constants;
mod firmware;

mod models {
  pub mod actions;
  pub mod config;
  pub mod log;
  pub mod rov_config;
  pub mod rov_status;
  pub mod rov_telemetry;
  pub mod toast;
}

mod recording;
mod websocket;

mod config;
mod gamepad;
mod log;
mod toast;

use std::sync::Arc;

use commands::firmware::FlashControl;
use commands::{
  append_recording_chunk, cancel_flash, cancel_regulator_auto_tuning, cancel_thruster_test,
  cleanup_firmware_cache, close_splashscreen, download_firmware_update, fetch_app_releases,
  fetch_firmware_manifest, flash_esc_firmware, flash_mcu_firmware, gamepad_vibrate, get_config,
  import_rov_config, initialize_log_listener, install_app_release, list_firmware_releases,
  list_flash_drives, prepare_flash, request_rov_config, save_recording, send_custom_action,
  send_direction_vector, set_config, set_desired_depth, set_rov_config, signal_flash_image,
  start_gamepad_stream, start_regulator_auto_tuning, start_thruster_test,
  toggle_auto_stabilization, toggle_depth_hold,
};
use config::ConfigSendChannelState;
use log::log_init;
use models::config::Config;
use tauri::async_runtime::spawn;
use tauri::webview::PageLoadEvent;
use tauri::{App, Builder, Manager, generate_handler};
use toast::toast_init;
use tokio::sync::mpsc::channel;

use websocket::client::{
  DirectionVectorSendChannelState, MessageSendChannelState, OutboundMessage, start_websocket_client,
};
use websocket::message::WebsocketMessage;

fn setup_handlers(app: &mut App) {
  let log_handle = app.app_handle().clone();
  log_init(log_handle);

  let toast_handle = app.app_handle().clone();
  toast_init(toast_handle);

  app.manage(Arc::new(FlashControl::default()));

  let websocket_handle = app.app_handle().clone();
  let (config_tx, config_rx) = channel::<Config>(1);
  app.manage(ConfigSendChannelState { tx: config_tx });
  let (message_tx, message_rx) = channel::<OutboundMessage>(1);
  app.manage(MessageSendChannelState { tx: message_tx });
  let (direction_vector_tx, direction_vector_rx) = channel::<WebsocketMessage>(8);
  app.manage(DirectionVectorSendChannelState {
    tx: direction_vector_tx,
  });
  spawn(async move {
    start_websocket_client(websocket_handle, config_rx, message_rx, direction_vector_rx).await;
  });
}

fn parse_flag(prefix: &str, args: &[String]) -> Option<String> {
  for arg in args {
    if let Some(value) = arg.strip_prefix(prefix) {
      return Some(value.to_string());
    }
  }
  None
}

fn run_flasher_cli(args: &[String]) -> i32 {
  let Some(device) = parse_flag("--device=", args) else {
    eprintln!("flasher: --device=DEVICE is required");
    return 2;
  };
  let Some(status_file) = parse_flag("--status-file=", args) else {
    eprintln!("flasher: --status-file=PATH is required");
    return 2;
  };

  let result = if let Some(signal_file) = parse_flag("--wait-for-signal=", args) {
    firmware::run_flash_deferred(&device, &status_file, &signal_file)
  } else {
    let Some(image) = parse_flag("--image=", args) else {
      eprintln!("flasher: --image=PATH or --wait-for-signal=PATH is required");
      return 2;
    };
    let image_size = parse_flag("--image-size=", args)
      .and_then(|raw| raw.parse::<u64>().ok())
      .unwrap_or(0);
    let verify = parse_flag("--verify=", args).is_none_or(|raw| raw != "false");
    let flash_args = firmware::FlashArgs {
      image,
      device,
      status_file: status_file.clone(),
      image_size,
      verify,
    };
    firmware::run_flash(&flash_args)
  };

  if let Err(error) = result {
    if let Ok(mut status) = firmware::status::StatusWriter::new(std::path::Path::new(&status_file))
    {
      let _ = status.write(&firmware::FlashStatus::Error {
        message: error.clone(),
      });
    }
    eprintln!("flasher: {error}");
    return 1;
  }
  0
}

/// Work around a `WebKitGTK` bug where an unset `gtk-xft-dpi` (`-1`) yields a
/// negative `window.devicePixelRatio`, collapsing the layout so the UI renders
/// microscopically. Happens on Wayland sessions with no XSETTINGS daemon (e.g.
/// Hyprland). Set a valid 96 DPI only when unset, so sessions that provide one
/// keep it; `HiDPI` scaling still comes from the compositor's output scale.
///
/// Remove once fixed upstream: <https://bugs.webkit.org/show_bug.cgi?id=287811>
#[cfg(target_os = "linux")]
fn fix_gtk_dpi() {
  use gtk::prelude::GtkSettingsExt;

  if let Some(settings) = gtk::Settings::default()
    && settings.gtk_xft_dpi() <= 0
  {
    // 96 DPI in 1024ths of a point.
    settings.set_gtk_xft_dpi(96 * 1024);
  }
}

/// Make the bundled `WebKit` helper binaries executable, recovering into the
/// cache dir when the install location is read-only and the packaging dropped
/// the exec bits. Returns the directory the helpers should be spawned from.
#[cfg(target_os = "linux")]
fn ensure_webkit_helpers_executable(exec_dir: std::path::PathBuf) -> std::path::PathBuf {
  use std::os::unix::fs::PermissionsExt;

  let probe = exec_dir.join("WebKitWebProcess");
  let Ok(meta) = probe.metadata() else {
    return exec_dir;
  };
  if meta.permissions().mode() & 0o111 != 0 {
    return exec_dir;
  }
  let helpers: Vec<std::path::PathBuf> = std::fs::read_dir(&exec_dir)
    .map(|entries| entries.flatten().map(|entry| entry.path()).collect())
    .unwrap_or_default();
  let executable = std::fs::Permissions::from_mode(0o755);
  if helpers
    .iter()
    .all(|path| std::fs::set_permissions(path, executable.clone()).is_ok())
  {
    return exec_dir;
  }
  // Read-only install (e.g. /usr). Copy the helpers somewhere writable; their
  // rpath carries an absolute /usr/lib/Manafish fallback so they still find
  // the bundled libraries from there.
  let Some(cache_dir) = dirs::cache_dir() else {
    return exec_dir;
  };
  let recovered = cache_dir.join("manafish/webkit-exec");
  if std::fs::create_dir_all(&recovered).is_err() {
    return exec_dir;
  }
  for path in &helpers {
    let Some(name) = path.file_name() else {
      continue;
    };
    let target = recovered.join(name);
    if std::fs::copy(path, &target).is_err()
      || std::fs::set_permissions(&target, executable.clone()).is_err()
    {
      return exec_dir;
    }
  }
  recovered
}

/// Point `WebKitGTK` at the bundled WebRTC-enabled runtime when present.
///
/// Distro `WebKitGTK` builds compile without `ENABLE_WEB_RTC`, leaving
/// `RTCPeerConnection` undefined in the webview, so the packages ship our own
/// build under `<resources>/webkit`. The deb/rpm install it at the compiled-in
/// prefix (`/usr/lib/Manafish/webkit`), but the `AppImage` mounts at a random
/// path, so the helper binaries are located through `WEBKIT_EXEC_PATH`
/// (honored because the build sets `ENABLE_DEVELOPER_MODE`). Must run before
/// any GTK/WebKit code and before other threads exist: `set_var` requires it.
#[cfg(target_os = "linux")]
fn setup_bundled_webkit() {
  let Ok(exe) = std::env::current_exe() else {
    return;
  };
  let Some(bin_dir) = exe.parent() else {
    return;
  };
  let Ok(webkit_dir) = bin_dir.join("../lib/Manafish/webkit").canonicalize() else {
    return;
  };
  let exec_dir = webkit_dir.join("libexec/webkit2gtk-4.1");
  if !exec_dir.join("WebKitWebProcess").is_file() {
    return;
  }
  let exec_dir = ensure_webkit_helpers_executable(exec_dir);
  let bundle_dir = webkit_dir.join("lib/webkit2gtk-4.1/injected-bundle");
  // SAFETY: called at startup before any other threads are spawned.
  unsafe {
    std::env::set_var("WEBKIT_EXEC_PATH", &exec_dir);
    std::env::set_var("WEBKIT_INJECTED_BUNDLE_PATH", &bundle_dir);
  }
}

/// # Errors
/// Returns an error if the Tauri application cannot be built.
pub fn run() -> tauri::Result<()> {
  const SPLASHSCREEN_FALLBACK_SECONDS: u64 = 15;

  let raw_args: Vec<String> = std::env::args().collect();
  if raw_args.iter().any(|arg| arg == "--flash") {
    let exit_code = run_flasher_cli(&raw_args);
    std::process::exit(exit_code);
  }
  #[cfg(target_os = "linux")]
  setup_bundled_webkit();
  // Builds distributed through a package manager (Flatpak, Snap, AUR,
  // nixpkgs, Homebrew, winget, deb/rpm repos) must not self-update: the
  // package manager owns the binary and its version. Those builds set
  // `MANAFISH_UPDATER_DISABLED=1` at compile time (and the matching
  // `VITE_UPDATER_DISABLED=1` for the frontend) so the updater plugin is not
  // registered. Direct downloads (AppImage, macOS .dmg/.app, Windows
  // .exe/.msi) leave it unset, keeping the updater enabled by default.
  let updater_disabled = matches!(option_env!("MANAFISH_UPDATER_DISABLED"), Some("1"));

  let mut builder = Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init());

  if !updater_disabled {
    builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
  }

  let builder = builder
    .on_page_load(|webview, payload| {
      if webview.label() == "splashscreen" && payload.event() == PageLoadEvent::Finished {
        let _ = webview.window().show();
      }
    })
    .invoke_handler(generate_handler![
      close_splashscreen,
      start_gamepad_stream,
      gamepad_vibrate,
      get_config,
      initialize_log_listener,
      set_config,
      request_rov_config,
      set_rov_config,
      import_rov_config,
      start_thruster_test,
      cancel_thruster_test,
      start_regulator_auto_tuning,
      cancel_regulator_auto_tuning,
      send_direction_vector,
      send_custom_action,
      toggle_auto_stabilization,
      set_desired_depth,
      append_recording_chunk,
      toggle_depth_hold,
      flash_mcu_firmware,
      flash_esc_firmware,
      list_firmware_releases,
      fetch_firmware_manifest,
      download_firmware_update,
      cleanup_firmware_cache,
      list_flash_drives,
      prepare_flash,
      signal_flash_image,
      cancel_flash,
      save_recording,
      fetch_app_releases,
      install_app_release,
    ])
    .setup(|app| {
      #[cfg(target_os = "linux")]
      fix_gtk_dpi();
      setup_handlers(app);
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_secs(SPLASHSCREEN_FALLBACK_SECONDS)).await;
        if app_handle.get_webview_window("splashscreen").is_some() {
          let message = format!(
            "Splashscreen watchdog fired after {SPLASHSCREEN_FALLBACK_SECONDS}s on {}; revealing the main window",
            std::env::consts::OS
          );
          log::log_startup_diagnostic(&message);
          if let Err(error) = close_splashscreen(app_handle.clone()) {
            let error_message = format!(
              "Splashscreen watchdog failed to reveal the main window: {error}"
            );
            log::log_startup_diagnostic(&error_message);
          }
        }
      });
      Ok(())
    });

  builder.build(tauri::generate_context!())?.run(|_app_handle, _event| {});

  Ok(())
}
