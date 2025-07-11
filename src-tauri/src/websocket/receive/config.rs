use crate::models::rov_config::{Regulator, RovConfig};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_config_response(app_handle: &AppHandle, payload: &RovConfig) -> Option<Message> {
  app_handle.emit("rov_config_retrieved", payload).unwrap();
  None
}

pub fn handle_regulator_suggestions(
  app_handle: &AppHandle,
  payload: &Regulator,
) -> Option<Message> {
  app_handle
    .emit("regulator_suggestions_received", payload)
    .unwrap();
  None
}
