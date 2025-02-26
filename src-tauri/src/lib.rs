mod commands {
  pub mod config;
}

mod models {
  pub mod config;
}

mod input_handler;
mod websocket_client;

use commands::config::{get_config, save_config};
use tauri::Manager;
use websocket_client::spawn_websocket_client;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let rt = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");

  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_gamepad::init())
    .invoke_handler(tauri::generate_handler![get_config, save_config])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      let config = get_config().unwrap();
      let ws_client = spawn_websocket_client(config, rt.handle().clone());

      std::thread::spawn(move || loop {
        if window.is_focused().unwrap_or(false) {
          if let Ok(array) = input_handler::get_input_array() {
            let ws_client = ws_client.clone();
            rt.spawn(async move {
              if let Some(client) = ws_client.lock().await.as_ref() {
                if let Err(e) = client.send_input(array).await {
                  eprintln!("Failed to send input: {}", e);
                }
              }
            });
          }
        }
        std::thread::sleep(std::time::Duration::from_millis(16));
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
