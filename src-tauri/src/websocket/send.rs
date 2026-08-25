use std::sync::atomic::{AtomicU64, Ordering};
use tauri::State;
use tokio::sync::{mpsc::Sender, oneshot};

use crate::log_error;
use crate::models::actions::{CustomAction, DirectionVector};
use crate::models::rov_config::{McuBoard, PartialRovConfig, ThrusterTest};
use crate::websocket::client::{
  DirectionVectorInput, DirectionVectorSendChannelState, MessageSendChannelState, OutboundMessage,
};
use crate::websocket::message::ConfigMutation;
use crate::websocket::message::WebsocketMessage;

/// # Errors
/// Returns an error if the WebSocket client has stopped receiving control input.
fn publish_direction_vector(
  tx: &tokio::sync::watch::Sender<DirectionVectorInput>,
  last_sequence: &AtomicU64,
  payload: DirectionVector,
  sequence: u64,
) -> Result<(), String> {
  if !accept_direction_sequence(last_sequence, sequence) {
    return Ok(());
  }
  tx.send(DirectionVectorInput::active(payload)).map_err(|error| {
    log_error!("Failed to publish DirectionVector: {error}");
    error.to_string()
  })
}

/// # Errors
/// Returns an error if the WebSocket client has stopped receiving control input.
fn deactivate_direction_vector(
  tx: &tokio::sync::watch::Sender<DirectionVectorInput>,
  last_sequence: &AtomicU64,
  sequence: u64,
) -> Result<(), String> {
  if !accept_direction_sequence(last_sequence, sequence) {
    return Ok(());
  }
  tx.send(DirectionVectorInput::inactive()).map_err(|error| {
    log_error!("Failed to deactivate DirectionVector: {error}");
    error.to_string()
  })
}

fn accept_direction_sequence(last_sequence: &AtomicU64, sequence: u64) -> bool {
  last_sequence
    .fetch_update(Ordering::AcqRel, Ordering::Acquire, |current| {
      (sequence > current).then_some(sequence)
    })
    .is_ok()
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
async fn send_message(
  tx: &Sender<OutboundMessage>,
  message: WebsocketMessage,
  label: &str,
) -> Result<(), String> {
  tx.send(OutboundMessage {
    message,
    sent: None,
  })
  .await
  .map_err(|error| {
    log_error!("Failed to send {label}: {error}");
    error.to_string()
  })
}

/// Queue a message and wait until the active WebSocket has written it.
///
/// # Errors
/// Returns an error if the message cannot be queued or its delivery fails.
async fn send_message_and_wait(
  tx: &Sender<OutboundMessage>,
  message: WebsocketMessage,
  label: &str,
) -> Result<(), String> {
  let (sent_tx, sent_rx) = oneshot::channel();
  tx.send(OutboundMessage {
    message,
    sent: Some(sent_tx),
  })
  .await
  .map_err(|error| {
    log_error!("Failed to queue {label}: {error}");
    error.to_string()
  })?;

  sent_rx.await.map_err(|error| {
    log_error!("Failed to confirm {label} delivery: {error}");
    error.to_string()
  })?
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_send_direction_vector(
  state: &State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
  sequence: u64,
) -> Result<(), String> {
  publish_direction_vector(&state.tx, &state.last_sequence, payload, sequence)
}

/// # Errors
/// Returns an error if the WebSocket client has stopped receiving control input.
pub async fn handle_deactivate_direction_vector(
  state: &State<'_, DirectionVectorSendChannelState>,
  sequence: u64,
) -> Result<(), String> {
  deactivate_direction_vector(&state.tx, &state.last_sequence, sequence)
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
pub async fn handle_set_auto_stabilization(
  state: &State<'_, MessageSendChannelState>,
  enabled: bool,
) -> Result<(), String> {
  send_message_and_wait(
    &state.tx,
    WebsocketMessage::SetAutoStabilization(enabled),
    "SetAutoStabilization",
  )
  .await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_set_depth_hold(
  state: &State<'_, MessageSendChannelState>,
  enabled: bool,
) -> Result<(), String> {
  send_message_and_wait(&state.tx, WebsocketMessage::SetDepthHold(enabled), "SetDepthHold").await
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
  mutation_id: String,
) -> Result<(), String> {
  send_message_and_wait(
    &state.tx,
    WebsocketMessage::SetConfig(ConfigMutation {
      mutation_id,
      config: payload,
    }),
    "SetConfig",
  )
  .await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_import_rov_config(
  state: &State<'_, MessageSendChannelState>,
  payload: serde_json::Value,
  mutation_id: String,
) -> Result<(), String> {
  send_message_and_wait(
    &state.tx,
    WebsocketMessage::ImportConfig(ConfigMutation {
      mutation_id,
      config: payload,
    }),
    "ImportConfig",
  )
  .await
}

/// # Errors
/// Returns an error if the config acknowledgement cannot reach the ROV.
pub async fn handle_confirm_rov_config(
  state: &State<'_, MessageSendChannelState>,
  mutation_id: String,
) -> Result<(), String> {
  send_message_and_wait(&state.tx, WebsocketMessage::ConfirmConfig(mutation_id), "ConfirmConfig")
    .await
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
  send_message_and_wait(&state.tx, WebsocketMessage::FlashMcuFirmware(payload), "FlashMcuFirmware")
    .await
}

/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn handle_flash_esc_firmware(
  state: &State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  send_message_and_wait(&state.tx, WebsocketMessage::FlashEscFirmware, "FlashEscFirmware").await
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if publishing fails or the receiver does not observe the latest input.
  #[tokio::test]
  async fn direction_vector_channel_keeps_only_the_latest_input() {
    let (tx, mut rx) = tokio::sync::watch::channel(DirectionVectorInput::inactive());
    let first = [0.1; 8];
    let latest = [0.9; 8];

    let last_sequence = AtomicU64::new(0);
    publish_direction_vector(&tx, &last_sequence, first, 1).expect("publish first input");
    publish_direction_vector(&tx, &last_sequence, latest, 2).expect("publish latest input");
    rx.changed().await.expect("observe changed input");

    let (observed, active) =
      rx.borrow_and_update().vector_for_tick(false, std::time::Instant::now());
    let observed = observed.expect("active direction vector");
    assert!(active);
    assert!(
      observed
        .iter()
        .zip(latest)
        .all(|(actual, expected)| (*actual - expected).abs() < f32::EPSILON)
    );
  }

  /// # Panics
  /// Panics if an older send can override a newer deactivation command.
  #[tokio::test]
  async fn stale_direction_vector_cannot_reactivate_input() {
    let (tx, rx) = tokio::sync::watch::channel(DirectionVectorInput::inactive());
    let last_sequence = AtomicU64::new(0);

    publish_direction_vector(&tx, &last_sequence, [0.8; 8], 2).expect("publish input");
    deactivate_direction_vector(&tx, &last_sequence, 3).expect("deactivate input");
    publish_direction_vector(&tx, &last_sequence, [0.9; 8], 1).expect("drop stale input");

    let (observed, active) = rx.borrow().vector_for_tick(true, std::time::Instant::now());
    assert_eq!(observed, Some([0.0; 8]));
    assert!(!active);
  }

  /// # Panics
  /// Panics if the message isn't queued, acknowledged, or completed successfully.
  #[tokio::test]
  async fn send_message_waits_for_websocket_delivery() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    let send_task = tokio::spawn(async move {
      send_message_and_wait(&tx, WebsocketMessage::GetConfig, "GetConfig").await
    });

    let outbound = rx.recv().await.expect("queued websocket message");
    assert!(!send_task.is_finished());
    outbound
      .sent
      .expect("delivery acknowledgement")
      .send(Ok(()))
      .expect("waiting sender");

    assert_eq!(send_task.await.expect("send task"), Ok(()));
  }

  /// # Panics
  /// Panics if the message isn't queued or the delivery failure isn't propagated.
  #[tokio::test]
  async fn send_message_returns_websocket_delivery_failure() {
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);
    let send_task = tokio::spawn(async move {
      send_message_and_wait(&tx, WebsocketMessage::GetConfig, "GetConfig").await
    });

    let outbound = rx.recv().await.expect("queued websocket message");
    outbound
      .sent
      .expect("delivery acknowledgement")
      .send(Err("delivery failed".to_string()))
      .expect("waiting sender");

    assert_eq!(send_task.await.expect("send task"), Err("delivery failed".to_string()));
  }
}
