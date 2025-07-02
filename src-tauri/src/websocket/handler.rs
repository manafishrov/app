use super::message::WebsocketMessage;
use super::receive::{
  log_firmware::handle_log_firmware,
  states::handle_states,
  status::handle_status,
  thrusters::{handle_thruster_allocation, handle_thruster_pin_setup},
};
use crate::{log_error, log_warn};
use tauri::AppHandle;
use tokio_tungstenite::tungstenite::Message;

pub async fn handle_message(app_handle: &AppHandle, message: Message) -> Option<Message> {
  if let Message::Text(text) = message {
    match serde_json::from_str::<WebsocketMessage>(&text) {
      Ok(incoming_message) => match incoming_message {
        WebsocketMessage::Status(payload) => handle_status(app_handle, &payload),
        WebsocketMessage::States(payload) => handle_states(app_handle, &payload),
        WebsocketMessage::LogFirmware(payload) => handle_log_firmware(app_handle, &payload),
        WebsocketMessage::ThrusterPinSetup(payload) => {
          handle_thruster_pin_setup(app_handle, &payload)
        }
        WebsocketMessage::ThrusterAllocation(payload) => {
          handle_thruster_allocation(app_handle, &payload)
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
