mod commands {
  pub mod actions;
  pub mod config;
  pub mod gamepad;
  pub mod rov_config;
}

mod models {
  pub mod actions;
  pub mod config;
  pub mod log;
  pub mod rov_config;
  pub mod rov_status;
  pub mod rov_telemetry;
  pub mod toast;
}

mod websocket {
  pub mod client;
  pub mod handler;
  pub mod message;
  pub mod receive {
    pub mod config;
    pub mod log;
    pub mod status;
    pub mod telemetry;
    pub mod toast;
  }
  pub mod send {
    pub mod actions;
    pub mod config;
  }
}

mod config;
mod gamepad;
mod log;
mod toast;
mod updater;

use commands::actions::{
  append_recording_chunk, save_recording, send_custom_action, send_direction_vector,
  toggle_auto_stabilization, toggle_depth_hold,
};
use commands::config::{get_config, set_config};
use commands::gamepad::{gamepad_vibrate, start_gamepad_stream};
use commands::rov_config::{
  cancel_regulator_auto_tuning, cancel_thruster_test, flash_microcontroller_firmware,
  request_rov_config, set_rov_config, start_regulator_auto_tuning, start_thruster_test,
};
use config::ConfigSendChannelState;
use log::log_init;
use models::config::Config;
use tauri::async_runtime::spawn;
use tauri::{App, Builder, Manager, generate_handler};
use toast::toast_init;
use tokio::sync::mpsc::channel;
use updater::update_app;
use websocket::client::{
  DirectionVectorSendChannelState, MessageSendChannelState, start_websocket_client,
};
use websocket::message::WebsocketMessage;

fn setup_handlers(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
  let log_handle = app.app_handle().clone();
  log_init(log_handle);

  let toast_handle = app.app_handle().clone();
  toast_init(toast_handle);

  let update_handle = app.app_handle().clone();
  spawn(async move {
    update_app(update_handle).await.unwrap();
  });

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

  Ok(())
}

pub fn run() {
  let builder = Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(generate_handler![
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
      append_recording_chunk,
      toggle_depth_hold,
      flash_microcontroller_firmware,
      save_recording,
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}
