use crate::models::thrusters::{TestThruster, ThrusterAllocation, ThrusterPinSetup};
use crate::websocket::{
  client::MessageSendChannelState,
  send::thrusters::{
    handle_cancel_test_thruster, handle_get_thruster_config, handle_test_thruster,
    handle_thruster_allocation, handle_thruster_pin_setup,
  },
};
use tauri::State;

#[tauri::command]
pub async fn thruster_pin_setup(
  state: State<'_, MessageSendChannelState>,
  payload: ThrusterPinSetup,
) -> Result<(), String> {
  handle_thruster_pin_setup(&state, payload).await;
  Ok(())
}

#[tauri::command]
pub async fn thruster_allocation(
  state: State<'_, MessageSendChannelState>,
  payload: ThrusterAllocation,
) -> Result<(), String> {
  handle_thruster_allocation(&state, payload).await;
  Ok(())
}

#[tauri::command]
pub async fn get_thruster_config(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_get_thruster_config(&state).await;
  Ok(())
}

#[tauri::command]
pub async fn test_thruster(
  state: State<'_, MessageSendChannelState>,
  payload: TestThruster,
) -> Result<(), String> {
  handle_test_thruster(&state, payload).await;
  Ok(())
}

#[tauri::command]
pub async fn cancel_test_thruster(
  state: State<'_, MessageSendChannelState>,
  payload: TestThruster,
) -> Result<(), String> {
  handle_cancel_test_thruster(&state, payload).await;
  Ok(())
}
