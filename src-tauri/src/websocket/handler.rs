use super::capabilities::{CapabilityState, emit_capability_event};
use tauri::{AppHandle, Manager};
use tokio_tungstenite::tungstenite::Message;

use super::message::WebsocketMessage;
use super::receive::{
  handle_config, handle_log_message, handle_regulator_suggestions, handle_show_toast,
};
use crate::log_warn;

pub async fn handle_message(app_handle: &AppHandle, message: Message) -> Option<Message> {
  if let Message::Text(text) = message {
    match serde_json::from_str::<WebsocketMessage>(&text) {
      Ok(incoming_message) => match incoming_message {
        WebsocketMessage::LogMessage(payload) => handle_log_message(app_handle, &payload),
        WebsocketMessage::ShowToast(payload) => handle_show_toast(app_handle, &payload),
        WebsocketMessage::CapabilityResponse(payload) => {
          app_handle.state::<CapabilityState>().receive(payload);
          None
        },
        WebsocketMessage::CapabilityCatalog(payload) => {
          emit_capability_event(app_handle, "capability_catalog", &payload);
          None
        },
        WebsocketMessage::CapabilitySamples(payload) => {
          emit_capability_event(app_handle, "capability_samples", &payload);
          None
        },
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
