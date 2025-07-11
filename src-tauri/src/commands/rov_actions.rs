use crate::models::rov_actions::RovMovementCommand;
use crate::websocket::{
  client::MessageSendChannelState, send::actions::handle_send_movement_command,
};
use tauri::{command, State};

#[command]
pub async fn send_movement_command(
  state: State<'_, MessageSendChannelState>,
  payload: RovMovementCommand,
) -> Result<(), String> {
  handle_send_movement_command(&state, payload).await
}
