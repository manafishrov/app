use crate::models::regulator::{MovementCoefficients, Regulator};
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_regulator(app_handle: &AppHandle, payload: &Regulator) -> Option<Message> {
  app_handle.emit("regulator", payload).unwrap();
  None
}

pub fn handle_movement_coefficients(
  app_handle: &AppHandle,
  payload: &MovementCoefficients,
) -> Option<Message> {
  app_handle.emit("movement_coefficients", payload).unwrap();
  None
}
