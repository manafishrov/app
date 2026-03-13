use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::rov_status::RovStatus;

pub fn handle_status_update(app_handle: &AppHandle, payload: &RovStatus) -> Option<Message> {
  if let Err(error) = app_handle.emit("rov_status_update", payload) {
    log_warn!("Failed to emit ROV status update: {error}");
  }
  None
}
