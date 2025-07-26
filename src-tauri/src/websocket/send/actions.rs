use crate::log_error;
use crate::models::actions::{CustomAction, DirectionVector};
use crate::websocket::{
  client::{DirectionVectorSendChannelState, MessageSendChannelState},
  message::WebsocketMessage,
};
use tauri::State;

pub async fn handle_send_direction_vector(
  state: &State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
) -> Result<(), String> {
  let message = WebsocketMessage::DirectionVector(payload);
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send DirectionVector: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_send_custom_action(
  state: &State<'_, MessageSendChannelState>,
  payload: CustomAction,
) -> Result<(), String> {
  let message = WebsocketMessage::CustomAction(payload);
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send CustomAction: {}", e);
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
