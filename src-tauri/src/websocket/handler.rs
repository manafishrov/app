use tauri::AppHandle;
use tokio_tungstenite::tungstenite::Message;

use super::message::WebsocketMessage;
use super::receive::config::{
  handle_config, handle_regulator_suggestions,
};
use super::receive::log::handle_log_message;
use super::receive::status::handle_status_update;
use super::receive::telemetry::handle_telemetry;
use super::receive::toast::handle_show_toast;
use crate::log_warn;

pub async fn handle_message(app_handle: &AppHandle, message: Message) -> Option<Message> {
  if let Message::Text(text) = message {
    match serde_json::from_str::<WebsocketMessage>(&text) {
      Ok(incoming_message) => match incoming_message {
        WebsocketMessage::LogMessage(payload) => handle_log_message(app_handle, &payload),
        WebsocketMessage::ShowToast(payload) => handle_show_toast(app_handle, &payload),
        WebsocketMessage::Telemetry(payload) => handle_telemetry(app_handle, &payload),
        WebsocketMessage::StatusUpdate(payload) => handle_status_update(app_handle, &payload),
        WebsocketMessage::Config(payload) => handle_config(app_handle, &payload),
        WebsocketMessage::RegulatorSuggestions(payload) => {
          handle_regulator_suggestions(app_handle, &payload)
        },
        other => {
          log_warn!("Received unhandled message type: {:?}", other);
          None
        },
      },
      Err(e) => {
        log_warn!("Failed to deserialize message: {}", e);
        None
      },
    }
  } else {
    None
  }
}
