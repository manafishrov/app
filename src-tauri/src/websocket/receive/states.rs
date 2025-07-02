use crate::models::states::States;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_states(app_handle: &AppHandle, payload: &States) -> Option<Message> {
  app_handle.emit("states", payload).unwrap();
  None
}
