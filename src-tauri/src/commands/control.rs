use tauri::{State, command};

use crate::models::actions::{CustomAction, DirectionVector};
use crate::websocket::client::{DirectionVectorSendChannelState, MessageSendChannelState};
use crate::websocket::send::{
  handle_send_custom_action, handle_send_direction_vector, handle_set_desired_depth,
  handle_toggle_auto_stabilization, handle_toggle_depth_hold,
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
pub async fn toggle_auto_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_auto_stabilization(&state).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn toggle_depth_hold(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_toggle_depth_hold(&state).await
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
