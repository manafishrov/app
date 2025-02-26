mod commands {
  pub mod config;
  pub mod connection;
}

mod models {
  pub mod config;
}

mod input_handler;
mod websocket_client;

use commands::config::{get_config, save_config};
use commands::connection::get_connection_status;
use tauri::Manager;
use websocket_client::spawn_websocket_client;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
  let config = get_config().unwrap();
  let ws_client = spawn_websocket_client(config, rt.handle().clone());

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_gamepad::init())
    .manage(ws_client.clone())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
    ])
    .setup(move |app| {
      let window = app.get_webview_window("main").unwrap();
      input_handler::spawn_input_handler(window, ws_client.clone(), rt.handle().clone());
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
