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

pub async fn handle_send_action1_command(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::RunAction1;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send RunAction1: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_send_action2_command(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::RunAction2;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send RunAction2: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_toggle_pitch_stabilization(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::TogglePitchStabilization;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send TogglePitchStabilization: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_toggle_roll_stabilization(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::ToggleRollStabilization;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send ToggleRollStabilization: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_toggle_depth_stabilization(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::ToggleDepthStabilization;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send ToggleDepthStabilization: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}
