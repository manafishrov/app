use crate::models::log::LogEntry;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_log_message(app_handle: &AppHandle, payload: &LogEntry) -> Option<Message> {
  app_handle.emit("log_message", payload).unwrap();
  None
}
