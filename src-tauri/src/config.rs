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

#[cfg(mobile)]
static MOBILE_CONFIG_DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

/// Mobile apps have no home config directory, so the sandboxed app config
/// directory is resolved once the app starts.
#[cfg(mobile)]
pub fn init_config_dir(app: &tauri::AppHandle) {
  use tauri::Manager;

  match app.path().app_config_dir() {
    Ok(dir) => {
      let _ = MOBILE_CONFIG_DIR.set(dir);
    },
    Err(error) => log_error!("Failed to resolve the config directory: {error}"),
  }
}

#[cfg(desktop)]
pub fn get_config_path() -> Option<PathBuf> {
  dirs::config_dir().map(|base_dir| base_dir.join("manafish").join("config.json"))
}

#[cfg(mobile)]
pub fn get_config_path() -> Option<PathBuf> {
  MOBILE_CONFIG_DIR.get().map(|dir| dir.join("config.json"))
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

/// The camera overlay is stored per ROV, so drop the old fixed-overlay settings
/// and any layout a release candidate kept in the app config.
fn remove_overlay_settings(object: &mut serde_json::Map<String, serde_json::Value>) {
  for key in [
    "overlay", "overlayScale", "attitudeIndicator", "workIndicator", "thrusterRpmOverlay",
  ] {
    object.remove(key);
  }
}

/// Drop bindings for the removed module-based custom actions, which only named a
/// Python module, and the trigger setting the ROV now owns per action.
fn migrate_custom_action_bindings(object: &mut serde_json::Map<String, serde_json::Value>) {
  let Some(serde_json::Value::Array(bindings)) = object.get_mut("customActions") else {
    return;
  };
  bindings.retain_mut(|binding| {
    let Some(binding) = binding.as_object_mut() else {
      return false;
    };
    binding.remove("module");
    binding.remove("trigger");
    binding
      .get("actionId")
      .and_then(serde_json::Value::as_str)
      .is_some_and(|id| !id.is_empty())
  });
}

/// Upgrade stable settings directly, without intermediate release-candidate layouts.
fn apply_migrations(mut raw: serde_json::Value) -> serde_json::Value {
  if let Some(object) = raw.as_object_mut() {
    // This update-key cleanup already shipped before v1.0.18.
    if let Some(value) = object.remove("checkForUpdatesOnStartup") {
      object.insert("checkForAppUpdatesOnStartup".to_string(), value);
    }
    object.remove("checkForFirmwareUpdatesOnConnect");
    remove_overlay_settings(object);
    migrate_custom_action_bindings(object);
  }
  raw
}

fn show_config_parse_failed_toast() {
  toast_warn(
    None,
    ToastContent {
      message: None,
      description: None,
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
      message: None,
      description: None,
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
  // Assertions and propagated fixture errors are the purpose of these tests.
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;
  use serde_json::json;

  fn sample_raw_config() -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    // All persisted fields from v1.0.18, acc7c338f2dfb1d620b0086c1d4123ce0f45aa9e:
    // src-tauri/src/models/config.rs, with non-default operator preferences.
    Ok(serde_json::from_str(include_str!("fixtures/config-v1.0.18.json"))?)
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

  #[test]
  fn stable_upgrade_preserves_all_retained_settings_and_adds_detection_defaults()
  -> Result<(), Box<dyn std::error::Error>> {
    let stable = sample_raw_config()?;
    let upgraded = apply_migrations(stable.clone());
    let config: Config = serde_json::from_value(upgraded.clone())?;
    let saved = serde_json::to_value(config)?;
    for (key, value) in stable.as_object().ok_or("stable object")? {
      if matches!(
        key.as_str(),
        "overlayScale"
          | "attitudeIndicator"
          | "workIndicator"
          | "thrusterRpmOverlay"
          | "customActions"
      ) {
        continue;
      }
      if key == "keyboard" || key == "gamepad" {
        continue;
      }
      assert_eq!(&saved[key], value, "retained stable setting {key}");
    }
    assert_eq!(saved["customActions"], json!([]));
    let mut expected_keyboard = stable["keyboard"].clone();
    expected_keyboard["objectDetection"] = json!({"key": "KeyV", "minValue": 0.0, "maxValue": 1.0});
    // Photos came later; existing setups get the key unbound rather than P.
    expected_keyboard["takePhoto"] = json!(null);
    assert_eq!(saved["keyboard"], expected_keyboard);
    let mut expected_gamepad = stable["gamepad"].clone();
    expected_gamepad["dive-controller"]["objectDetection"] = json!(null);
    expected_gamepad["dive-controller"]["takePhoto"] = json!(null);
    assert_eq!(saved["gamepad"], expected_gamepad);
    assert_eq!(
      saved["detection"],
      serde_json::to_value(crate::models::config::DetectionConfig::default())?
    );
    assert_eq!(apply_migrations(upgraded.clone()), upgraded);
    Ok(())
  }

  /// # Panics
  /// Panics if an overlay setting stays in the app config, where it would fail
  /// `deny_unknown_fields`.
  #[test]
  fn apply_migrations_removes_app_side_overlay_settings() -> Result<(), Box<dyn std::error::Error>>
  {
    let mut raw = sample_raw_config()?;
    raw["attitudeIndicator"] = json!("classic");
    raw["workIndicator"] = json!(true);
    raw["thrusterRpmOverlay"] = json!(true);
    raw["overlay"] = json!({"activeLayoutId": "default", "layouts": []});

    let mut migrated = apply_migrations(raw);

    for key in [
      "overlay", "overlayScale", "attitudeIndicator", "workIndicator", "thrusterRpmOverlay",
    ] {
      assert!(migrated.get(key).is_none(), "{key} was kept");
    }
    migrated["appVersion"] = json!(current_app_version());
    assert!(serde_json::from_value::<Config>(migrated).is_ok());
    Ok(())
  }

  /// # Panics
  /// Panics if module-based bindings survive or capability bindings lose inputs.
  #[test]
  fn apply_migrations_removes_module_custom_action_bindings()
  -> Result<(), Box<dyn std::error::Error>> {
    let mut raw = sample_raw_config()?;
    raw["customActions"] = json!([
      {"id": "legacy", "module": "example_action", "trigger": "tap",
        "keyboard": {"key": "KeyE", "minValue": 0, "maxValue": 1}, "gamepad": {}},
      {"id": "binding", "actionId": "water_sensor.toggle_monitoring", "module": "",
        "trigger": "hold", "keyboard": null, "gamepad": {}},
    ]);

    let mut migrated = apply_migrations(raw);

    assert_eq!(
      migrated["customActions"],
      json!([{"id": "binding", "actionId": "water_sensor.toggle_monitoring",
        "keyboard": null, "gamepad": {}}])
    );
    migrated["appVersion"] = json!(current_app_version());
    assert!(serde_json::from_value::<Config>(migrated).is_ok());
    Ok(())
  }

  /// # Panics
  /// Panics if stripping removes a recognised field, keeps an unknown field, or
  /// leaves a config that no longer deserializes.
  #[test]
  fn strip_unknown_fields_drops_only_unrecognised_keys() -> Result<(), Box<dyn std::error::Error>> {
    // A config written by a newer app version: a valid default plus an extra
    // field this build doesn't know about.
    let mut raw = serde_json::to_value(Config::default())?;
    raw
      .as_object_mut()
      .ok_or("config is an object")?
      .insert("newFutureField".to_string(), json!({ "anything": 42 }));

    strip_unknown_fields(&mut raw);

    let object = raw.as_object().ok_or("still an object")?;
    // The unknown field is gone...
    assert!(!object.contains_key("newFutureField"));
    // ...while recognised fields (including a flattened one) remain.
    assert!(object.contains_key("appVersion"));
    // A flattened field still survives.
    assert!(object.contains_key("checkForAppUpdatesOnStartup"));
    assert!(object.contains_key("ipAddress"));

    // The stripped config still deserializes despite `deny_unknown_fields`.
    assert!(
      serde_json::from_value::<Config>(raw).is_ok(),
      "stripped config should deserialize"
    );
    Ok(())
  }
}
