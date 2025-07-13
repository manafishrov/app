use super::message::WebsocketMessage;
use super::receive::{
  config::{
    handle_config, handle_firmware_version, handle_regulator_suggestions,
  },
  log::handle_log_message,
  status::handle_status_update,
  telemetry::handle_telemetry,
  toast::handle_show_toast,
};
use crate::{log_error, log_warn};
use tauri::AppHandle;
use tokio_tungstenite::tungstenite::Message;

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
        }
        WebsocketMessage::FirmwareVersion(payload) => {
          handle_firmware_version(app_handle, &payload)
        }
        other => {
          log_warn!("Received unhandled message type: {:?}", other);
          None
        }
      },
      Err(e) => {
        log_error!("Failed to deserialize incoming WebSocket message");
        log_warn!("Failed to deserialize message: {}", e);
        None
      }
    }
  } else {
    None
  }
}
