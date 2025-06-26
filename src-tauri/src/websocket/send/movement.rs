use crate::models::movement::MovementCommand;
use crate::websocket::{client::MessageSendChannelState, message::WebsocketMessage};
use tauri::State;

pub async fn handle_movement(state: &State<'_, MessageSendChannelState>, payload: MovementCommand) {
  let message = WebsocketMessage::MovementCommand(payload);
  let _ = state.tx.send(message).await;
}
