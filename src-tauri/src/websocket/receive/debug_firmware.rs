use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_debug_firmware(app_handle: &AppHandle, payload: &str) -> Option<Message> {
  app_handle.emit("debug_firmware", payload).unwrap();
  None
}
