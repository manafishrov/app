use crate::models::config::Config;
use crate::toast::toast_warn;
use crate::{log_error, log_warn};
use std::fs;
use std::path::PathBuf;
use tokio::sync::mpsc::Sender;

pub struct ConfigSendChannelState {
  pub tx: Sender<Config>,
}

pub fn get_config_path() -> Option<PathBuf> {
  dirs::config_dir().map(|base_dir| base_dir.join("manafish").join("config.json"))
}

pub fn get_config_from_file() -> Config {
  let config_path = match get_config_path() {
    Some(path) => path,
    None => {
      log_warn!("Failed to get config directory. Using default config.");
      return Config::default();
    }
  };

  match fs::read_to_string(&config_path) {
    Ok(content) => match serde_json::from_str(&content) {
      Ok(config) => config,
      Err(e) => {
        if let Err(delete_err) = fs::remove_file(&config_path) {
          log_warn!("Failed to delete corrupted config: {}", delete_err);
        }
        log_warn!("Failed to parse config: {}. Using default config.", e);
        toast_warn(
          None,
          "Failed to parse app config, using default config instead".to_string(),
          None,
          None,
        );
        Config::default()
      }
    },
    Err(e) => {
      log_warn!("Failed to read config: {}. Using default config.", e);
      toast_warn(
        None,
        "Failed to parse app config, using default config instead".to_string(),
        None,
        None,
      );
      Config::default()
    }
  }
}

pub async fn set_config_to_file(
  state: &ConfigSendChannelState,
  payload: Config,
) -> Result<(), String> {
  let config_path = match get_config_path() {
    Some(path) => path,
    None => {
      log_error!("Failed to get config directory. Could not save config file.");
      return Err("Failed to get config directory.".to_string());
    }
  };

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  let content = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
  fs::write(&config_path, &content).map_err(|e| e.to_string())?;

  state.tx.send(payload).await.map_err(|e| e.to_string())?;

  Ok(())
}
