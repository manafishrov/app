use crate::models::actions::{CustomAction, DirectionVector};
use crate::websocket::{
  client::{DirectionVectorSendChannelState, MessageSendChannelState},
  send::actions::{
    handle_send_custom_action, handle_send_direction_vector, handle_toggle_depth_hold,
    handle_toggle_pitch_stabilization, handle_toggle_roll_stabilization,
  },
};
use tauri::{command, State};

#[command]
pub async fn send_direction_vector(
  state: State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
) -> Result<(), String> {
  handle_send_direction_vector(&state, payload).await
}

#[command]
pub async fn send_custom_action(
  state: State<'_, MessageSendChannelState>,
  payload: CustomAction,
) -> Result<(), String> {
  handle_send_custom_action(&state, payload).await
}

#[command]
pub async fn toggle_pitch_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_pitch_stabilization(&state).await
}

#[command]
pub async fn toggle_roll_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_roll_stabilization(&state).await
}

#[command]
pub async fn toggle_depth_hold(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_toggle_depth_hold(&state).await
}
