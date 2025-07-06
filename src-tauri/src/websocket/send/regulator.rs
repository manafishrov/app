use crate::models::regulator::{MovementCoefficients, Regulator};
use crate::websocket::{client::MessageSendChannelState, message::WebsocketMessage};
use tauri::State;

pub async fn handle_regulator(state: &State<'_, MessageSendChannelState>, payload: Regulator) {
  let message = WebsocketMessage::Regulator(payload);
  let _ = state.tx.send(message).await;
}

pub async fn handle_movement_coefficients(
  state: &State<'_, MessageSendChannelState>,
  payload: MovementCoefficients,
) {
  let message = WebsocketMessage::MovementCoefficients(payload);
  let _ = state.tx.send(message).await;
}

pub async fn handle_get_regulator_config(state: &State<'_, MessageSendChannelState>) {
  let message = WebsocketMessage::GetRegulatorConfig;
  let _ = state.tx.send(message).await;
}

pub async fn handle_regulator_auto_tuning(state: &State<'_, MessageSendChannelState>) {
  let message = WebsocketMessage::RegulatorAutoTuning;
  let _ = state.tx.send(message).await;
}
