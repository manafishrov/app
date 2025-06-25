use super::message::WebsocketMessage;
use super::receive::{
  log_firmware::handle_log_firmware, settings::handle_settings, status::handle_status,
};
use crate::log_warn;
use tauri::AppHandle;
use tokio_tungstenite::tungstenite::Message;

pub async fn handle_message(app_handle: &AppHandle, message: Message) -> Option<Message> {
  if let Message::Text(text) = message {
    match serde_json::from_str::<WebsocketMessage>(&text) {
      Ok(incoming_message) => match incoming_message {
        WebsocketMessage::Status(payload) => handle_status(app_handle, &payload),
        WebsocketMessage::Settings(payload) => handle_settings(app_handle, &payload),
        WebsocketMessage::LogFirmware(payload) => handle_log_firmware(app_handle, &payload),
        _ => None,
      },
      Err(e) => {
        log_warn!("Failed to deserialize message: {}", e);
        None
      }
    }
  } else {
    None
  }
}
