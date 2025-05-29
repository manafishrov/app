mod commands {
  pub mod config;
  pub mod control;
  pub mod gamepad;
}

mod models {
  pub mod config;
  pub mod gamepad;
  pub mod status;
}

mod gamepad;
mod websocket_client;

use commands::config::{get_config, save_config};
use commands::control::send_control_input;
use commands::gamepad::{execute_gamepad, vibrate_gamepad};
use tauri::Manager;
use tokio::sync::mpsc::Sender;

pub struct ControlChannelState {
  pub tx: Sender<[f32; 6]>,
}

fn setup_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let (control_tx, control_rx) = websocket_client::create_control_channel();
  let app_handle = app.app_handle().clone();

  app.manage(ControlChannelState { tx: control_tx });

  tauri::async_runtime::spawn(async move {
    websocket_client::start_websocket_client(control_rx, app_handle).await;
  });

  Ok(())
}

pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      send_control_input,
      execute_gamepad,
      vibrate_gamepad
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}
