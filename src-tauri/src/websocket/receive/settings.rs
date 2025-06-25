use crate::models::settings::Settings;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_settings(app_handle: &AppHandle, payload: &Settings) -> Option<Message> {
  app_handle.emit("settings", payload).unwrap();
  None
}
