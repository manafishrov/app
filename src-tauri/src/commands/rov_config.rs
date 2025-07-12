use crate::models::rov_config::{RovConfig, ThrusterTest};
use crate::websocket::{
  client::MessageSendChannelState,
  send::config::{
    handle_cancel_regulator_auto_tuning, handle_cancel_thruster_test, handle_request_rov_config,
    handle_set_rov_config, handle_start_regulator_auto_tuning, handle_start_thruster_test, handle_request_firmware_version,
  },
};
use tauri::{command, State};

#[command]
pub async fn request_rov_config(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_request_rov_config(&state).await
}

#[command]
pub async fn set_rov_config(
  state: State<'_, MessageSendChannelState>,
  payload: RovConfig,
) -> Result<(), String> {
  handle_set_rov_config(&state, payload).await
}

#[command]
pub async fn start_thruster_test(
  state: State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  handle_start_thruster_test(&state, payload).await
}

#[command]
pub async fn cancel_thruster_test(
  state: State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  handle_cancel_thruster_test(&state, payload).await
}

#[command]
pub async fn start_regulator_auto_tuning(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_start_regulator_auto_tuning(&state).await
}

#[command]
pub async fn cancel_regulator_auto_tuning(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_cancel_regulator_auto_tuning(&state).await
}

#[command]
pub async fn request_firmware_version(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_request_firmware_version(&state).await
}
