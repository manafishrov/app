mod commands {
  pub mod config;
}

mod models {
  pub mod config;
}

mod input_handler;

use commands::config::{get_config, save_config};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_gamepad::init())
    .invoke_handler(tauri::generate_handler![get_config, save_config])
    .setup(|app| {
      let window = app.get_webview_window("main").unwrap();
      std::thread::spawn(move || loop {
        if window.is_focused().unwrap_or(false) {
          if let Ok(array) = input_handler::get_input_array() {
            println!("{:?}", array);
          }
        } else {
          println!("{:?}", [0.0; 6]);
        }
        std::thread::sleep(std::time::Duration::from_millis(16));
      });
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
