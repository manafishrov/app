mod commands;

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

use commands::{
  append_recording_chunk, cancel_regulator_auto_tuning, cancel_thruster_test, close_splashscreen,
  flash_mcu_firmware, gamepad_vibrate, get_config, request_rov_config, save_recording,
  send_custom_action, send_direction_vector, set_config, set_desired_depth, set_rov_config,
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

/// # Errors
/// Returns an error if the Tauri application cannot be built.
pub fn run() -> tauri::Result<()> {
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
      save_recording,
    ])
    .setup(|app| {
      setup_handlers(app);
      Ok(())
    });

  builder.build(tauri::generate_context!())?.run(|_app_handle, _event| {});

  Ok(())
}
