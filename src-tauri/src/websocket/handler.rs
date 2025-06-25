use super::message::WebsocketMessage;
use super::receive::{
  debug_firmware::handle_debug_firmware, settings::handle_settings, status::handle_status,
};
use tauri::AppHandle;
use tokio_tungstenite::tungstenite::Message;

pub async fn handle_message(app_handle: &AppHandle, message: Message) -> Option<Message> {
  if let Message::Text(text) = message {
    match serde_json::from_str::<WebsocketMessage>(&text) {
      Ok(incoming_message) => match incoming_message {
        WebsocketMessage::Status(payload) => handle_status(app_handle, &payload),
        WebsocketMessage::Settings(payload) => handle_settings(app_handle, &payload),
        WebsocketMessage::DebugFirmware(payload) => handle_debug_firmware(app_handle, &payload),
        _ => None,
      },
      Err(e) => {
        eprintln!("Failed to deserialize message: {}", e);
        None
      }
    }
  } else {
    None
  }
}
