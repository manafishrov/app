use crate::models::actions::RovMovementCommand;
use crate::websocket::{
  client::MessageSendChannelState,
  send::actions::{
    handle_send_action1_command, handle_send_action2_command, handle_send_movement_command,
    handle_toggle_depth_stabilization, handle_toggle_pitch_stabilization,
    handle_toggle_roll_stabilization,
  },
};
use tauri::{command, State};

#[command]
pub async fn send_movement_command(
  state: State<'_, MessageSendChannelState>,
  payload: RovMovementCommand,
) -> Result<(), String> {
  handle_send_movement_command(&state, payload).await
}

#[command]
pub async fn send_action1_command(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_send_action1_command(&state).await
}

#[command]
pub async fn send_action2_command(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_send_action2_command(&state).await
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
pub async fn toggle_depth_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_depth_stabilization(&state).await
}
