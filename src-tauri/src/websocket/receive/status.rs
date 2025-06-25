use crate::models::status::Status;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_status(app_handle: &AppHandle, payload: &Status) -> Option<Message> {
  app_handle.emit("status", payload).unwrap();
  None
}
