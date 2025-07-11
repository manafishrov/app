use crate::models::toast::Toast;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_show_toast(app_handle: &AppHandle, payload: &Toast) -> Option<Message> {
  app_handle.emit("show_toast", payload).unwrap();
  None
}
