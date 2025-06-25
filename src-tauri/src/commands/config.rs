use crate::models::config::Config;
use crate::ConfigSendChannelState;
use std::fs;
use std::path::PathBuf;
use tauri::State;

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
pub async fn save_config(
  state: State<'_, ConfigSendChannelState>,
  config: Config,
) -> Result<(), String> {
  let config_path = get_config_path();

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let content = serde_json::to_string(&config).map_err(|e| e.to_string())?;
  fs::write(&config_path, &content).map_err(|e| e.to_string())?;

  state.tx.send(config).await.map_err(|e| e.to_string())?;

  Ok(())
}
