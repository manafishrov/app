mod commands {
  pub mod config;
  pub mod connection;
}

mod models {
  pub mod config;
}

mod gamepad;
mod input_handler;
mod websocket_client;

use commands::config::{get_config, save_config};
use commands::connection::get_connection_status;
use tauri::Manager;

pub fn run() {
  let (input_tx, input_rx) = websocket_client::create_input_channel();

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
    ])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let app_handle = app.app_handle().clone();

      tauri::async_runtime::spawn(async move {
        input_handler::start_input_handler(window, input_tx, &app_handle).await;
      });

      tauri::async_runtime::spawn(async {
        websocket_client::start_websocket_client(input_rx).await;
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
