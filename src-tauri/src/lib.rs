mod commands {
  pub mod config;
  pub mod connection;
}

mod models {
  pub mod config;
}

mod input_handler;

use commands::config::{get_config, save_config};
use commands::connection::get_connection_status;

pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_gamepad::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
