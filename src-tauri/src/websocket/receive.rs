use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::log::LogEntry;
use crate::models::rov_config::{RegulatorSuggestions, RovConfig};
use crate::models::rov_status::RovStatus;
use crate::models::rov_telemetry::RovTelemetry;
use crate::models::toast::Toast;

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

pub fn handle_telemetry(app: &AppHandle, payload: &RovTelemetry) -> Option<Message> {
  emit_event(app, "rov_telemetry", payload);
  None
}

pub fn handle_status_update(app: &AppHandle, payload: &RovStatus) -> Option<Message> {
  emit_event(app, "rov_status_update", payload);
  None
}

pub fn handle_config(app: &AppHandle, payload: &RovConfig) -> Option<Message> {
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
