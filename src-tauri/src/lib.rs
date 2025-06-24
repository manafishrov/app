mod commands {
  pub mod config;
  pub mod gamepad;
  pub mod movement;
}

mod models {
  pub mod config;
  pub mod gamepad;
  pub mod status;
}

mod websocket {
  pub mod client;
  pub mod handler;
  mod receive {
    pub mod heartbeat;
    pub mod ping;
    pub mod pong;
  }
}

mod gamepad;
mod updater;

use commands::config::{get_config, save_config};
use commands::gamepad::execute_gamepad;
use commands::movement::send_movement_input;
use models::config::{Config, ConfigSendChannelState};
use tauri::async_runtime::spawn;
use tauri::{generate_handler, App, Builder, Manager, State};
use tokio::sync::mpsc::channel;
use tokio_tungstenite::tungstenite::Message;
use updater::update_app;
use websocket::client::{start_websocket_client, MessageSendChannelState};

fn setup_handlers(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
  let update_handle = app.app_handle().clone();
  spawn(async move {
    update_app(update_handle).await;
  });

  let websocket_handle = app.app_handle().clone();
  let (config_tx, config_rx) = channel::<Config>(1);
  app.manage(ConfigSendChannelState { tx: config_tx });
  let (message_tx, message_rx) = channel::<Message>(1);
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
      send_movement_input,
      execute_gamepad,
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}
