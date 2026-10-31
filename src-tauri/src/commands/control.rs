use tauri::{State, command};

use crate::models::actions::DirectionVector;
use crate::websocket::client::DirectionVectorSendChannelState;
use crate::websocket::send::{handle_deactivate_direction_vector, handle_send_direction_vector};

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn deactivate_direction_vector(
  state: State<'_, DirectionVectorSendChannelState>,
  sequence: u64,
) -> Result<(), String> {
  handle_deactivate_direction_vector(&state, sequence).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn send_direction_vector(
  state: State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
  sequence: u64,
) -> Result<(), String> {
  handle_send_direction_vector(&state, payload, sequence).await
}
