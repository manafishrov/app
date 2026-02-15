use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::models::toast::Toast;

pub fn handle_show_toast(app_handle: &AppHandle, payload: &Toast) -> Option<Message> {
  app_handle.emit("show_toast", payload).unwrap();
  None
}
