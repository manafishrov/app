use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::models::rov_config::{RegulatorSuggestions, RovConfig};

pub fn handle_config(app_handle: &AppHandle, payload: &RovConfig) -> Option<Message> {
  app_handle.emit("rov_config_received", payload).unwrap();
  None
}

pub fn handle_regulator_suggestions(
  app_handle: &AppHandle,
  payload: &RegulatorSuggestions,
) -> Option<Message> {
  app_handle.emit("regulator_suggestions_received", payload).unwrap();
  None
}
