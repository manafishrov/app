use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::toast::Toast;

pub fn handle_show_toast(app_handle: &AppHandle, payload: &Toast) -> Option<Message> {
  if let Err(error) = app_handle.emit("show_toast", payload) {
    log_warn!("Failed to emit toast event: {error}");
  }
  None
}
