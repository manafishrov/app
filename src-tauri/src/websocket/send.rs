use tauri::State;
use tokio::sync::mpsc::Sender;

use crate::log_error;
use crate::models::actions::{CustomAction, DirectionVector};
use crate::models::rov_config::{McuBoard, PartialRovConfig, ThrusterTest};
use crate::websocket::client::{DirectionVectorSendChannelState, MessageSendChannelState};
use crate::websocket::message::WebsocketMessage;

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
async fn send_message(
  tx: &Sender<WebsocketMessage>,
  message: WebsocketMessage,
  label: &str,
) -> Result<(), String> {
  tx.send(message).await.map_err(|error| {
    log_error!("Failed to send {label}: {error}");
    error.to_string()
  })
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_send_direction_vector(
  state: &State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::DirectionVector(payload), "DirectionVector").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_send_custom_action(
  state: &State<'_, MessageSendChannelState>,
  payload: CustomAction,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::CustomAction(payload), "CustomAction").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_toggle_auto_stabilization(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::ToggleAutoStabilization, "ToggleAutoStabilization")
    .await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_toggle_depth_hold(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::ToggleDepthHold, "ToggleDepthHold").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_set_desired_depth(
  state: &State<'_, MessageSendChannelState>,
  depth: f32,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::SetDesiredDepth(depth), "SetDesiredDepth").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_request_rov_config(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::GetConfig, "GetConfig").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_set_rov_config(
  state: &State<'_, MessageSendChannelState>,
  payload: PartialRovConfig,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::SetConfig(payload), "SetConfig").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_start_thruster_test(
  state: &State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::StartThrusterTest(payload), "StartThrusterTest").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_cancel_thruster_test(
  state: &State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::CancelThrusterTest(payload), "CancelThrusterTest").await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_start_regulator_auto_tuning(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  send_message(
    &state.tx,
    WebsocketMessage::StartRegulatorAutoTuning,
    "StartRegulatorAutoTuning",
  )
  .await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_cancel_regulator_auto_tuning(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  send_message(
    &state.tx,
    WebsocketMessage::CancelRegulatorAutoTuning,
    "CancelRegulatorAutoTuning",
  )
  .await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_flash_mcu_firmware(
  state: &State<'_, MessageSendChannelState>,
  payload: McuBoard,
) -> Result<(), String> {
  send_message(&state.tx, WebsocketMessage::FlashMcuFirmware(payload), "FlashMcuFirmware").await
}
