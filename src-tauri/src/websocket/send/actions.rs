use crate::log_error;
use crate::models::actions::RovMovementCommand;
use crate::websocket::{client::MessageSendChannelState, message::WebsocketMessage};
use tauri::State;

pub async fn handle_send_movement_command(
  state: &State<'_, MessageSendChannelState>,
  payload: RovMovementCommand,
) -> Result<(), String> {
  let message = WebsocketMessage::MovementCommand(payload);
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send MovementCommand: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}
