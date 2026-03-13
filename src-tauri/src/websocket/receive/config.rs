use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::rov_config::{RegulatorSuggestions, RovConfig};

pub fn handle_config(app_handle: &AppHandle, payload: &RovConfig) -> Option<Message> {
  if let Err(error) = app_handle.emit("rov_config_received", payload) {
    log_warn!("Failed to emit ROV config: {error}");
  }
  None
}

pub fn handle_regulator_suggestions(
  app_handle: &AppHandle,
  payload: &RegulatorSuggestions,
) -> Option<Message> {
  if let Err(error) = app_handle.emit("regulator_suggestions_received", payload) {
    log_warn!("Failed to emit regulator suggestions: {error}");
  }
  None
}
