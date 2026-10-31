use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::log::LogEntry;
use crate::models::rov_config::RegulatorSuggestions;
use crate::models::toast::Toast;
use crate::websocket::message::ConfigResponse;

fn emit_event<T: serde::Serialize + Clone>(app: &AppHandle, event: &str, payload: &T) {
  if let Err(error) = app.emit(event, payload) {
    log_warn!("Failed to emit {event}: {error}");
  }
}

pub fn handle_log_message(app: &AppHandle, payload: &LogEntry) -> Option<Message> {
  emit_event(app, "log_message", payload);
  None
}

pub fn handle_show_toast(app: &AppHandle, payload: &Toast) -> Option<Message> {
  emit_event(app, "show_toast", payload);
  None
}

pub fn handle_config(app: &AppHandle, payload: &ConfigResponse) -> Option<Message> {
  emit_event(app, "rov_config_received", payload);
  None
}

pub fn handle_regulator_suggestions(
  app: &AppHandle,
  payload: &RegulatorSuggestions,
) -> Option<Message> {
  emit_event(app, "regulator_suggestions_received", payload);
  None
}

/// Reads `firmwareVersion` from a config message that didn't match `RovConfig`,
/// so the app can still tell which firmware it is talking to when the config
/// format differs between versions.
pub fn handle_firmware_version(app: &AppHandle, text: &str) -> Option<Message> {
  let version = config_firmware_version(text)?;
  emit_event(app, "rov_firmware_version_received", &version);
  None
}

fn config_firmware_version(text: &str) -> Option<String> {
  let message: serde_json::Value = serde_json::from_str(text).ok()?;
  if message.get("type")?.as_str()? != "config" {
    return None;
  }
  Some(message.pointer("/payload/config/firmwareVersion")?.as_str()?.to_string())
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if the firmware version is not read from config messages the app
  /// cannot otherwise parse.
  #[test]
  fn reads_firmware_version_from_unknown_config_format() {
    let config =
      r#"{"type":"config","payload":{"config":{"firmwareVersion":"1.2.0","newField":1}}}"#;
    assert_eq!(config_firmware_version(config), Some("1.2.0".to_string()));
    let telemetry = r#"{"type":"telemetry","payload":{"config":{"firmwareVersion":"1.2.0"}}}"#;
    assert_eq!(config_firmware_version(telemetry), None);
  }
}
