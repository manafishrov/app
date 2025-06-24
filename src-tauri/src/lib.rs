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

use crate::models::config::Config;
use commands::config::{get_config, save_config};
use commands::gamepad::execute_gamepad;
use commands::movement::send_movement_input;
use tauri::Manager;
use tokio::sync::mpsc;

pub struct ConfigSendChannelState {
  pub tx: mpsc::Sender<Config>,
}

fn setup_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let update_handle = app.app_handle().clone();
  let (tx, rx) = mpsc::channel::<Config>(1);

  app.manage(ConfigSendChannelState { tx });

  tauri::async_runtime::spawn(async move {
    updater::update(update_handle).await.unwrap();
  });

  tauri::async_runtime::spawn(async move {
    websocket::client::start(rx).await;
  });

  Ok(())
}

pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
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
