use super::receive::ping::handle_ping;
use serde::Deserialize;
use serde_json::Value;
use tauri::AppHandle;
use tokio_tungstenite::tungstenite::Message;

#[derive(Deserialize, Debug)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum IncomingMessage {
  Ping(Value),
}

pub async fn handle_message(app_handle: &AppHandle, message: Message) -> Option<Message> {
  if let Message::Text(text) = message {
    match serde_json::from_str::<IncomingMessage>(&text) {
      Ok(incoming_message) => match incoming_message {
        IncomingMessage::Ping(payload) => handle_ping(app_handle, &payload),
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
