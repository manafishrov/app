use tauri::{State, command};

use crate::models::rov_config::{McuBoard, PartialRovConfig, ThrusterTest};
use crate::websocket::client::MessageSendChannelState;
use crate::websocket::send::{
  handle_cancel_regulator_auto_tuning, handle_cancel_thruster_test, handle_flash_mcu_firmware,
  handle_import_rov_config, handle_request_rov_config, handle_set_rov_config,
  handle_start_regulator_auto_tuning, handle_start_thruster_test,
};

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn request_rov_config(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_request_rov_config(&state).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn set_rov_config(
  state: State<'_, MessageSendChannelState>,
  payload: PartialRovConfig,
) -> Result<(), String> {
  handle_set_rov_config(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn import_rov_config(
  state: State<'_, MessageSendChannelState>,
  payload: serde_json::Value,
) -> Result<(), String> {
  handle_import_rov_config(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn start_thruster_test(
  state: State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  handle_start_thruster_test(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn cancel_thruster_test(
  state: State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  handle_cancel_thruster_test(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn start_regulator_auto_tuning(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_start_regulator_auto_tuning(&state).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn cancel_regulator_auto_tuning(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_cancel_regulator_auto_tuning(&state).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn flash_mcu_firmware(
  state: State<'_, MessageSendChannelState>,
  payload: McuBoard,
) -> Result<(), String> {
  handle_flash_mcu_firmware(&state, payload).await
}
