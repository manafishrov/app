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
use input_handler::shutdown_input_handler;
use tauri::{Manager, RunEvent};

pub fn run() {
  let (input_tx, input_rx) = websocket_client::create_input_channel();

  let builder = tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![
      get_config,
      save_config,
      get_connection_status,
      get_water_sensor_status
    ])
    .setup(|app| {
      let window = app
        .get_webview_window("main")
        .expect("Failed to get main window");
      let app_handle = app.app_handle().clone();

      tauri::async_runtime::spawn(async move {
        input_handler::start_input_handler(window, input_tx, app_handle);
      });

      tauri::async_runtime::spawn(async move {
        websocket_client::start_websocket_client(input_rx).await;
      });

      Ok(())
    });

  builder
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|_app_handle, event| match event {
      RunEvent::ExitRequested { .. } => {
        println!("Exit requested, shutting down input handler...");
        shutdown_input_handler();
      }
      RunEvent::Exit => {
        println!("Exiting application.");
        shutdown_input_handler();
      }
      _ => {}
    });
}
