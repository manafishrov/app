use crate::models::rov_config::{FirmwareVersion, RegulatorSuggestions, RovConfig};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_config(app_handle: &AppHandle, payload: &RovConfig) -> Option<Message> {
  app_handle.emit("rov_config_recieved", payload).unwrap();
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

pub fn handle_firmware_version(
  app_handle: &AppHandle,
  payload: &FirmwareVersion,
) -> Option<Message> {
  app_handle
    .emit("firmware_version_recieved", payload)
    .unwrap();
  None
}
