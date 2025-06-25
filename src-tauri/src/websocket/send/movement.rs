use crate::websocket::{client::MessageSendChannelState, message::WebsocketMessage};
use tauri::State;

pub async fn handle_movement(state: &State<'_, MessageSendChannelState>, payload: [f32; 6]) {
  let message = WebsocketMessage::MovementCommand(payload);
  let _ = state.tx.send(message).await;
}
