mod commands {
  pub mod config;
  pub mod gamepad;
  pub mod rov_actions;
  pub mod rov_config;
}

mod models {
  pub mod config;
  pub mod gamepad;
  pub mod log;
  pub mod rov_actions;
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

use commands::config::{get_config, set_config};
use commands::gamepad::start_gamepad_stream;
use commands::rov_actions::send_movement_command;
use commands::rov_config::{
  cancel_regulator_auto_tuning, cancel_thruster_test, request_rov_config, set_rov_config,
  start_regulator_auto_tuning, start_thruster_test,
};
use config::ConfigSendChannelState;
use log::log_init;
use models::config::Config;
use tauri::async_runtime::spawn;
use tauri::{generate_handler, App, Builder, Manager};
use toast::toast_init;
use tokio::sync::mpsc::channel;
use updater::update_app;
use websocket::client::{start_websocket_client, MessageSendChannelState};
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
  spawn(async move {
    start_websocket_client(websocket_handle, config_rx, message_rx).await;
  });

  Ok(())
}

pub fn run() {
  let builder = Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(generate_handler![
      start_gamepad_stream,
      get_config,
      set_config,
      request_rov_config,
      set_rov_config,
      start_thruster_test,
      cancel_thruster_test,
      start_regulator_auto_tuning,
      cancel_regulator_auto_tuning,
      send_movement_command,
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}
