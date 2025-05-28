use crate::models::config::Config;
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
  let base_dir = dirs::config_dir().expect("Failed to get config directory");
  base_dir.join("manafish").join("config.json")
}

#[tauri::command]
pub fn get_config() -> Result<Config, String> {
  let config_path = get_config_path();

  if let Ok(content) = fs::read_to_string(&config_path) {
    match serde_json::from_str(&content) {
      Ok(config) => Ok(config),
      Err(_e) => {
        if let Err(delete_err) = fs::remove_file(&config_path) {
          return Err(format!("Failed to delete corrupted config: {}", delete_err));
        }
        Ok(Config::default())
      }
    }
  } else {
    Ok(Config::default())
  }
}

#[tauri::command]
pub fn save_config(config: Config) -> Result<(), String> {
  let config_path = get_config_path();

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let content = serde_json::to_string(&config).map_err(|e| e.to_string())?;
  fs::write(config_path, content).map_err(|e| e.to_string())?;

  crate::websocket_client::update_config(&config);

  Ok(())
}
