mod commands {
  pub mod config;
  pub mod status;
}

mod models {
  pub mod config;
}

mod gamepad;
mod input_handler;
mod keyboard;
mod websocket_client;

use commands::config::{get_config, save_config};
use commands::status::{get_connection_status, get_water_sensor_status};
use tauri::Manager;

fn setup_handlers(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
  let window = app
    .get_webview_window("main")
    .expect("Failed to get main window");
  let app_handle = app.app_handle().clone();
  let (input_tx, input_rx) = websocket_client::create_input_channel();

  tauri::async_runtime::spawn(async move {
    input_handler::start_input_handler(window, input_tx, app_handle);
  });

  tauri::async_runtime::spawn(async move {
    websocket_client::start_websocket_client(input_rx).await;
  });

  Ok(())
}

pub fn run() {
  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
      get_water_sensor_status
    ])
    .setup(setup_handlers);

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, _event| {});
}
