mod commands {
  pub mod config;
  pub mod gamepad;
  pub mod movement;
  pub mod regulator;
  pub mod thrusters;
}

mod models {
  pub mod config;
  pub mod gamepad;
  pub mod log;
  pub mod movement;
  pub mod regulator;
  pub mod states;
  pub mod status;
  pub mod thrusters;
  pub mod toast;
}

mod websocket {
  pub mod client;
  pub mod handler;
  pub mod message;
  pub mod receive {
    pub mod log_firmware;
    pub mod regulator;
    pub mod states;
    pub mod status;
    pub mod thrusters;
    pub mod toast;
  }
  pub mod send {
    pub mod movement;
    pub mod regulator;
    pub mod thrusters;
  }
}

mod gamepad;
mod log;
mod toast;
mod updater;

use commands::config::{get_config, save_config};
use commands::gamepad::execute_gamepad;
use commands::movement::send_movement_input;
use commands::regulator::{
  get_regulator_config, movement_coefficients, regulator, regulator_auto_tuning,
};
use commands::thrusters::{
  cancel_test_thruster, get_thruster_config, test_thruster, thruster_allocation, thruster_pin_setup,
};
use log::log_init;
use models::config::{Config, ConfigSendChannelState};
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
      get_config,
      save_config,
      execute_gamepad,
      send_movement_input,
      thruster_pin_setup,
      thruster_allocation,
      get_thruster_config,
      test_thruster,
      cancel_test_thruster,
      regulator,
      get_regulator_config,
      movement_coefficients,
      regulator_auto_tuning,
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}
