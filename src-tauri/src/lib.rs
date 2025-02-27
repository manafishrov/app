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

pub fn run() {
  let (input_tx, input_rx) = websocket_client::create_input_channel();

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_gamepad::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
    ])
    .setup(|app| {
      let window = app.get_window("main").unwrap();

      tauri::async_runtime::spawn(async move {
        input_handler::start_input_handler(window, input_tx).await;
      });

      tauri::async_runtime::spawn(async {
        websocket_client::start_websocket_client(input_rx).await;
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
