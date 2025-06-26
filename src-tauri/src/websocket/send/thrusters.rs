use crate::models::thrusters::{TestThruster, ThrusterAllocation, ThrusterPinSetup};
use crate::websocket::{client::MessageSendChannelState, message::WebsocketMessage};
use tauri::State;

pub async fn handle_thruster_pin_setup(
  state: &State<'_, MessageSendChannelState>,
  payload: ThrusterPinSetup,
) {
  let message = WebsocketMessage::ThrusterPinSetup(payload);
  let _ = state.tx.send(message).await;
}

pub async fn handle_thruster_allocation(
  state: &State<'_, MessageSendChannelState>,
  payload: ThrusterAllocation,
) {
  let message = WebsocketMessage::ThrusterAllocation(payload);
  let _ = state.tx.send(message).await;
}

pub async fn handle_get_thruster_config(state: &State<'_, MessageSendChannelState>) {
  let message = WebsocketMessage::GetThrusterConfig;
  let _ = state.tx.send(message).await;
}

pub async fn handle_test_thruster(
  state: &State<'_, MessageSendChannelState>,
  payload: TestThruster,
) {
  let message = WebsocketMessage::TestThruster(payload);
  let _ = state.tx.send(message).await;
}
