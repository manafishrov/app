use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::log::LogEntry;

pub fn handle_log_message(app_handle: &AppHandle, payload: &LogEntry) -> Option<Message> {
  if let Err(error) = app_handle.emit("log_message", payload) {
    log_warn!("Failed to emit log message: {error}");
  }
  None
}
