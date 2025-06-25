use crate::websocket::{client::MessageSendChannelState, send::movement::handle_movement};
use tauri::State;

#[tauri::command]
pub async fn send_movement_input(
  state: State<'_, MessageSendChannelState>,
  payload: [f32; 6],
) -> Result<(), String> {
  handle_movement(&state, payload).await;
  Ok(())
}
