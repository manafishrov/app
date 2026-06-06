mod commands;
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
  cleanup_firmware_cache, close_splashscreen, download_firmware_update, fetch_firmware_manifest,
  flash_mcu_firmware, gamepad_vibrate, get_config, import_rov_config, list_firmware_releases,
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
  DirectionVectorSendChannelState, MessageSendChannelState, start_websocket_client,
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
  let (message_tx, message_rx) = channel::<WebsocketMessage>(1);
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

/// # Errors
/// Returns an error if the Tauri application cannot be built.
pub fn run() -> tauri::Result<()> {
  let raw_args: Vec<String> = std::env::args().collect();
  if raw_args.iter().any(|arg| arg == "--flash") {
    let exit_code = run_flasher_cli(&raw_args);
    std::process::exit(exit_code);
  }
  let builder = Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
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
      list_firmware_releases,
      fetch_firmware_manifest,
      download_firmware_update,
      cleanup_firmware_cache,
      list_flash_drives,
      prepare_flash,
      signal_flash_image,
      cancel_flash,
      save_recording,
    ])
    .setup(|app| {
      #[cfg(target_os = "linux")]
      fix_gtk_dpi();
      setup_handlers(app);
      Ok(())
    });

  builder.build(tauri::generate_context!())?.run(|_app_handle, _event| {});

  Ok(())
}
