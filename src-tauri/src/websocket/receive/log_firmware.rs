use crate::models::log::Log;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_log_firmware(app_handle: &AppHandle, payload: &Log) -> Option<Message> {
  app_handle.emit("log_firmware", payload).unwrap();
  None
}
