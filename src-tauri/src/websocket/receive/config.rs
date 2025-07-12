use crate::models::rov_config::{FirmwareVersion, RegulatorSuggestions, RovConfig};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_config_response(app_handle: &AppHandle, payload: &RovConfig) -> Option<Message> {
  app_handle.emit("rov_config_retrieved", payload).unwrap();
  None
}

pub fn handle_regulator_suggestions(
  app_handle: &AppHandle,
  payload: &RegulatorSuggestions,
) -> Option<Message> {
  app_handle
    .emit("regulator_suggestions_received", payload)
    .unwrap();
  None
}

pub fn handle_firmware_version_response(
  app_handle: &AppHandle,
  payload: &FirmwareVersion,
) -> Option<Message> {
  app_handle
    .emit("firmware_version_retrieved", payload)
    .unwrap();
  None
}
