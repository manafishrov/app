use crate::models::toast::Toast;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_toast(app_handle: &AppHandle, payload: &Toast) -> Option<Message> {
  app_handle.emit("toast", payload).unwrap();
  None
}
