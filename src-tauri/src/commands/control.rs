use tauri::{State, command};

use crate::models::actions::{CustomAction, DirectionVector};
use crate::websocket::client::{DirectionVectorSendChannelState, MessageSendChannelState};
use crate::websocket::send::{
  handle_send_custom_action, handle_send_direction_vector, handle_set_auto_stabilization,
  handle_set_depth_hold, handle_set_desired_depth,
};

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn send_direction_vector(
  state: State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
) -> Result<(), String> {
  handle_send_direction_vector(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn send_custom_action(
  state: State<'_, MessageSendChannelState>,
  payload: CustomAction,
) -> Result<(), String> {
  handle_send_custom_action(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn set_auto_stabilization(
  state: State<'_, MessageSendChannelState>,
  enabled: bool,
) -> Result<(), String> {
  handle_set_auto_stabilization(&state, enabled).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn set_depth_hold(
  state: State<'_, MessageSendChannelState>,
  enabled: bool,
) -> Result<(), String> {
  handle_set_depth_hold(&state, enabled).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn set_desired_depth(
  state: State<'_, MessageSendChannelState>,
  depth: f32,
) -> Result<(), String> {
  handle_set_desired_depth(&state, depth).await
}
