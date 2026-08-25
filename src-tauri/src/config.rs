use std::fs;
use std::path::PathBuf;

use semver::Version;
use tokio::sync::mpsc::Sender;

use crate::models::config::Config;
use crate::models::toast::ToastContent;
use crate::toast::{toast_success, toast_warn};
use crate::version::current_app_version;
use crate::{log_error, log_warn};

pub struct ConfigSendChannelState {
  pub tx: Sender<Config>,
}

pub fn get_config_path() -> Option<PathBuf> {
  dirs::config_dir().map(|base_dir| base_dir.join("manafish").join("config.json"))
}

fn stored_version_is_newer(stored: &str, current: &str) -> bool {
  match (Version::parse(stored), Version::parse(current)) {
    (Ok(stored), Ok(current)) => stored > current,
    _ => false,
  }
}

/// Drop top-level keys this build doesn't recognise (against a serialized
/// default `Config`), so a config from a newer version still loads after a
/// downgrade instead of failing `deny_unknown_fields`.
fn strip_unknown_fields(raw: &mut serde_json::Value) {
  let Ok(serde_json::Value::Object(defaults)) = serde_json::to_value(Config::default()) else {
    return;
  };
  if let Some(object) = raw.as_object_mut() {
    object.retain(|key, _| defaults.contains_key(key));
  }
}

fn apply_migrations(raw: serde_json::Value) -> serde_json::Value {
  let stored_version = raw.get("appVersion").and_then(|v| v.as_str()).unwrap_or("0.0.0");

  let _ = stored_version;

  let mut raw = raw;
  if let Some(object) = raw.as_object_mut()
    && let Some(value) = object.remove("checkForUpdatesOnStartup")
  {
    object.insert("checkForAppUpdatesOnStartup".to_string(), value);
  }

  if let Some(object) = raw.as_object_mut() {
    object.remove("checkForFirmwareUpdatesOnConnect");
  }

  raw
}

fn show_config_parse_failed_toast() {
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
}

fn persist_default_config(config_path: &PathBuf, config: &Config) {
  if let Some(parent) = config_path.parent() {
    let _ = fs::create_dir_all(parent);
  }

  if let Ok(serialized) = serde_json::to_string(config) {
    let _ = fs::write(config_path, serialized);
  }
}

fn fallback_to_default_config(config_path: &PathBuf, remove_existing: bool) -> Config {
  if remove_existing {
    let _ = fs::remove_file(config_path);
  }

  show_config_parse_failed_toast();
  let default_config = Config::default();
  persist_default_config(config_path, &default_config);
  default_config
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
      return fallback_to_default_config(&config_path, false);
    },
  };

  let mut raw: serde_json::Value = match serde_json::from_str(&content) {
    Ok(v) => v,
    Err(e) => {
      log_warn!("Failed to parse config: {}. Using default config.", e);
      return fallback_to_default_config(&config_path, true);
    },
  };

  let stored_version = raw.get("appVersion").and_then(|v| v.as_str()).unwrap_or("0.0.0");

  let current_version = current_app_version();

  if stored_version_is_newer(stored_version, &current_version) {
    // Downgrade: keep what this build understands, drop newer-only fields.
    log_warn!(
      "Config was written by a newer app version ({stored_version} > {current_version}). \
       Dropping unrecognised fields."
    );
    strip_unknown_fields(&mut raw);
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

/// # Errors
/// Returns an error if the config directory cannot be found, the config file
/// cannot be written, or the updated config cannot be sent to the websocket
/// client task.
pub async fn set_config_to_file(
  state: &ConfigSendChannelState,
  payload: Config,
) -> Result<(), String> {
  let payload = persist_config(payload)?;
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

/// Persist a future connection target without notifying the active WebSocket task.
///
/// # Errors
/// Returns an error if the config directory cannot be found or written.
pub fn stage_config_to_file(payload: Config) -> Result<(), String> {
  persist_config(payload).map(|_| ())
}

/// # Errors
/// Returns an error if the config path cannot be created, serialized, or written.
fn persist_config(mut payload: Config) -> Result<Config, String> {
  let Some(config_path) = get_config_path() else {
    log_error!("Failed to get config directory. Could not save config file.");
    return Err("Failed to get config directory.".to_string());
  };

  if let Some(parent) = config_path.parent() {
    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
  }

  payload.app_version = current_app_version();

  let content = serde_json::to_string(&payload).map_err(|e| e.to_string())?;
  fs::write(&config_path, &content).map_err(|e| e.to_string())?;
  Ok(payload)
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde_json::json;

  fn sample_raw_config() -> serde_json::Value {
    json!({
      "appVersion": "99.0.0",
      "overlayScale": 5,
      "attitudeIndicator": "scientific",
      "workIndicator": true,
      "thrusterRpmOverlay": false,
      "videoDirectory": "/tmp/manafish",
        "checkForUpdatesOnStartup": true,
        "ipAddress": "10.10.10.10",
        "webrtcSignalingApiPort": 1984,
        "webrtcSignalingApiPath": "/api/webrtc?src=cam",
        "webSocketPort": 9000,
        "keyboard": {},
        "selectedGamepadId": null,
        "gamepad": {}
    })
  }

  /// # Panics
  /// Panics if the stored-vs-current version comparison does not match the
  /// expected result for any case.
  #[test]
  fn stored_version_is_newer_detects_downgrades() {
    let cases = [
      // (stored, current, stored_is_newer)
      ("1.0.0", "1.0.0", false),
      ("2.0.0", "1.0.0", true),
      ("1.0.0", "2.0.0", false),
      ("1.1.0", "1.0.0", true),
      ("1.0.1", "1.0.0", true),
      ("0.9.9", "1.0.0", false),
      // A prerelease is older than its stable, so it never looks newer.
      ("1.0.13-rc.1", "1.0.13", false),
      ("1.0.13", "1.0.13-rc.1", true),
      // Unparseable stored versions must never trigger a config reset.
      ("", "1.0.0", false),
      ("abc.def.ghi", "1.0.0", false),
      ("1.0", "1.0.0", false),
    ];

    for (stored, current, expected) in cases {
      assert_eq!(
        stored_version_is_newer(stored, current),
        expected,
        "stored={stored} current={current}"
      );
    }
  }

  /// # Panics
  /// Panics if migrations split the legacy update toggle incorrectly.
  #[test]
  fn apply_migrations_splits_legacy_update_toggle() {
    let raw = sample_raw_config();

    let result = apply_migrations(raw);

    assert!(result.get("checkForUpdatesOnStartup").is_none());
    assert_eq!(result.get("checkForAppUpdatesOnStartup"), Some(&json!(true)));
    assert_eq!(result.get("checkForFirmwareUpdatesOnConnect"), None);
  }

  /// # Panics
  /// Panics if stripping removes a recognised field, keeps an unknown field, or
  /// leaves a config that no longer deserializes.
  #[test]
  fn strip_unknown_fields_drops_only_unrecognised_keys() {
    // A config written by a newer app version: a valid default plus an extra
    // field this build doesn't know about.
    let mut raw = serde_json::to_value(Config::default()).expect("serialize default");
    raw
      .as_object_mut()
      .expect("config is an object")
      .insert("newFutureField".to_string(), json!({ "anything": 42 }));

    strip_unknown_fields(&mut raw);

    let object = raw.as_object().expect("still an object");
    // The unknown field is gone...
    assert!(!object.contains_key("newFutureField"));
    // ...while recognised fields (including a flattened one) remain.
    assert!(object.contains_key("appVersion"));
    assert!(object.contains_key("workIndicator"));
    assert!(object.contains_key("ipAddress"));

    // The stripped config still deserializes despite `deny_unknown_fields`.
    assert!(
      serde_json::from_value::<Config>(raw).is_ok(),
      "stripped config should deserialize"
    );
  }
}
