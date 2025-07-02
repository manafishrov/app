use crate::models::regulator::Regulator;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_regulator(app_handle: &AppHandle, payload: &Regulator) -> Option<Message> {
  app_handle.emit("regulator", payload).unwrap();
  None
}
