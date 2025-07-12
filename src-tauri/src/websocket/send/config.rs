use crate::log_error;
use crate::models::rov_config::{RovConfig, ThrusterTest};
use crate::websocket::{client::MessageSendChannelState, message::WebsocketMessage};
use tauri::State;

pub async fn handle_request_rov_config(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::GetConfig;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send GetConfig: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_set_rov_config(
  state: &State<'_, MessageSendChannelState>,
  payload: RovConfig,
) -> Result<(), String> {
  let message = WebsocketMessage::SetConfig(payload);
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send SetConfig: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_start_thruster_test(
  state: &State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  let message = WebsocketMessage::StartThrusterTest(payload);
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send StartThrusterTest: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_cancel_thruster_test(
  state: &State<'_, MessageSendChannelState>,
  payload: ThrusterTest,
) -> Result<(), String> {
  let message = WebsocketMessage::CancelThrusterTest(payload);
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send CancelThrusterTest: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_start_regulator_auto_tuning(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::StartRegulatorAutoTuning;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send StartRegulatorAutoTuning: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_cancel_regulator_auto_tuning(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::CancelRegulatorAutoTuning;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send CancelRegulatorAutoTuning: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}

pub async fn handle_request_firmware_version(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  let message = WebsocketMessage::GetFirmwareVersion;
  if let Err(e) = state.tx.send(message).await {
    log_error!("Failed to send GetFirmwareVersion: {}", e);
    return Err(e.to_string());
  }
  Ok(())
}
