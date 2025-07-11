use crate::models::rov_status::RovStatus;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_status_update(app_handle: &AppHandle, payload: &RovStatus) -> Option<Message> {
  app_handle.emit("rov_status_update", payload).unwrap();
  None
}
