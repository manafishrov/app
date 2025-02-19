use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{command, Window};

#[derive(Serialize, Deserialize)]
struct Config {
  ip: String,
  stream_port: u16,
  control_port: u16,
}

fn get_config_path() -> PathBuf {
  let config_dir = tauri::api::path::app_config_dir(&tauri::Config::default()).unwrap();
  config_dir.join("config.json")
}

#[tauri::command]
fn get_config() -> Result<Config, String> {
  let config_path = get_config_path();

  if let Ok(content) = fs::read_to_string(config_path) {
    serde_json::from_str(&content).map_err(|e| e.to_string())
  } else {
    Ok(Config {
      ip: "10.10.10.10".to_string(),
      stream_port: 8889,
      control_port: 5000,
    })
  }
}

#[tauri::command]
fn save_config(ip: String, stream_port: u16, control_port: u16) -> Result<(), String> {
  let config = Config {
    ip,
    stream_port,
    control_port,
  };
  let config_path = get_config_path();

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let content = serde_json::to_string(&config).map_err(|e| e.to_string())?;
  fs::write(config_path, content).map_err(|e| e.to_string())?;

  Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .invoke_handler(tauri::generate_handler![get_config, save_config])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
