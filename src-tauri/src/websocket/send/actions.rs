use tauri::State;

use crate::log_error;
use crate::models::actions::{CustomAction, DirectionVector};
use crate::websocket::client::{DirectionVectorSendChannelState, MessageSendChannelState};
use crate::websocket::message::WebsocketMessage;

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
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

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
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

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_toggle_auto_stabilization(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::ToggleAutoStabilization;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send ToggleAutoStabilization: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_toggle_depth_hold(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::ToggleDepthHold;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send ToggleDepthHold: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}
