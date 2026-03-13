#![allow(clippy::missing_errors_doc)]

use std::cmp::Ordering;
use std::fs;
use std::path::PathBuf;

use tokio::sync::mpsc::Sender;

use crate::models::config::Config;
use crate::models::toast::ToastContent;
use crate::toast::{toast_success, toast_warn};
use crate::{log_error, log_warn};

pub struct ConfigSendChannelState {
  pub tx: Sender<Config>,
}

pub fn get_config_path() -> Option<PathBuf> {
  dirs::config_dir().map(|base_dir| base_dir.join("manafish").join("config.json"))
}

fn parse_semver(version: &str) -> (u32, u32, u32) {
  let parts: Vec<&str> = version.split('.').collect();
  let major = parts.first().and_then(|s| s.parse().ok()).unwrap_or(0);
  let minor = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
  let patch = parts.get(2).and_then(|s| s.parse().ok()).unwrap_or(0);
  (major, minor, patch)
}

fn compare_semver(a: &str, b: &str) -> Ordering {
  let (a_major, a_minor, a_patch) = parse_semver(a);
  let (b_major, b_minor, b_patch) = parse_semver(b);
  (a_major, a_minor, a_patch).cmp(&(b_major, b_minor, b_patch))
}

fn apply_migrations(raw: serde_json::Value) -> serde_json::Value {
  let stored_version = raw.get("appVersion").and_then(|v| v.as_str()).unwrap_or("0.0.0");

  let _ = stored_version;

  raw
}

pub fn get_config_from_file() -> Config {
  let Some(config_path) = get_config_path() else {
    log_warn!("Failed to get config directory. Using default config.");
    return Config::default();
  };

  let content = match fs::read_to_string(&config_path) {
    Ok(c) => c,
    Err(e) => {
      log_warn!("Failed to read config: {}. Using default config.", e);
      toast_warn(
        None,
        ToastContent {
          message_key: "toasts_app_config_parse_failed_using_default".to_string(),
          message_args: None,
          description_key: None,
          description_args: None,
        },
        None,
      );
      return Config::default();
    },
  };

  let mut raw: serde_json::Value = match serde_json::from_str(&content) {
    Ok(v) => v,
    Err(e) => {
      let _ = fs::remove_file(&config_path);
      log_warn!("Failed to parse config: {}. Using default config.", e);
      toast_warn(
        None,
        ToastContent {
          message_key: "toasts_app_config_parse_failed_using_default".to_string(),
          message_args: None,
          description_key: None,
          description_args: None,
        },
        None,
      );
      let default_config = Config::default();
      if let Ok(serialized) = serde_json::to_string(&default_config) {
        let _ = fs::write(&config_path, &serialized);
      }
      return default_config;
    },
  };

  let stored_version = raw.get("appVersion").and_then(|v| v.as_str()).unwrap_or("0.0.0");

  let current_version = env!("CARGO_PKG_VERSION");

  if compare_semver(stored_version, current_version) == Ordering::Greater {
    return Config::default();
  }

  raw = apply_migrations(raw);

  raw["appVersion"] = current_version.into();

  match serde_json::from_value(raw) {
    Ok(config) => config,
    Err(e) => {
      log_warn!("Failed to parse migrated config: {}. Using default config.", e);
      Config::default()
    },
  }
}

pub async fn set_config_to_file(
  state: &ConfigSendChannelState,
  mut payload: Config,
) -> Result<(), String> {
  let Some(config_path) = get_config_path() else {
    log_error!("Failed to get config directory. Could not save config file.");
    return Err("Failed to get config directory.".to_string());
  };

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  payload.app_version = env!("CARGO_PKG_VERSION").to_string();

  let content = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
  fs::write(&config_path, &content).map_err(|e| e.to_string())?;

  state.tx.send(payload).await.map_err(|e| e.to_string())?;

  toast_success(
    None,
    ToastContent {
      message_key: "toasts_app_config_set_success".to_string(),
      message_args: None,
      description_key: None,
      description_args: None,
    },
    None,
  );

  Ok(())
}
