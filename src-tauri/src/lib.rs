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
}

mod gamepad;
mod updater;

use commands::config::{get_config, save_config};
use commands::gamepad::execute_gamepad;
use commands::movement::send_movement_input;
use models::config::Config;
use tauri::async_runtime::spawn;
use tauri::{generate_handler, Builder, Manager};
use tokio::sync::mpsc;
use updater::update_app;
use websocket::client::start_websocket_client;

pub struct ConfigSendChannelState {
  pub tx: mpsc::Sender<Config>,
}

fn setup_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let update_handle = app.app_handle().clone();
  spawn(async move {
    update_app(update_handle).await;
  });

  let websocket_handle = app.app_handle().clone();
  let (tx, rx) = mpsc::channel::<Config>(1);
  app.manage(ConfigSendChannelState { tx });
  spawn(async move {
    start_websocket_client(websocket_handle, rx).await;
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
