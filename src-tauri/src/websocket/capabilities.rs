use std::collections::HashMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::oneshot;
use tokio::time::timeout;

use super::client::MessageSendChannelState;
use super::message::WebsocketMessage;
use super::send::send_message_and_wait;
use crate::log_warn;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const MAX_PENDING_REQUESTS: usize = 64;
type Reply = Result<Value, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityRequest {
  pub version: u8,
  pub request_id: String,
  pub operation: String,
  pub params: Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityError {
  pub code: String,
  pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityResponse {
  pub version: u8,
  pub request_id: String,
  pub ok: bool,
  pub result: Option<Value>,
  pub error: Option<CapabilityError>,
}

#[derive(Default)]
pub struct CapabilityState {
  connected: AtomicBool,
  sequence: AtomicU64,
  pending: Mutex<HashMap<String, oneshot::Sender<Reply>>>,
}

impl CapabilityState {
  pub fn set_connected(&self, connected: bool) {
    self.connected.store(connected, Ordering::Release);
    if !connected && let Ok(mut pending) = self.pending.lock() {
      for (_, sender) in pending.drain() {
        let _ = sender.send(Err("The ROV disconnected before completing the request".into()));
      }
    }
  }

  pub fn is_pending(&self, id: &str) -> bool {
    self.pending.lock().is_ok_and(|pending| pending.contains_key(id))
  }

  /// # Errors
  /// Returns an error if disconnected, overloaded, or the pending-request lock is poisoned.
  fn register(&self) -> Result<(String, oneshot::Receiver<Reply>), String> {
    let mut pending = self.pending.lock().map_err(|error| error.to_string())?;
    if !self.connected.load(Ordering::Acquire) {
      return Err("Connect to the ROV before performing this operation".into());
    }
    if pending.len() >= MAX_PENDING_REQUESTS {
      return Err("Too many requests are waiting for the ROV; try again shortly".into());
    }
    let id = format!("app-{}", self.sequence.fetch_add(1, Ordering::Relaxed));
    let (sender, receiver) = oneshot::channel();
    pending.insert(id.clone(), sender);
    Ok((id, receiver))
  }

  fn remove(&self, id: &str) -> Option<oneshot::Sender<Reply>> {
    self.pending.lock().ok().and_then(|mut pending| pending.remove(id))
  }

  pub fn receive(&self, response: CapabilityResponse) {
    if let Some(sender) = self.remove(&response.request_id) {
      let result = if response.version != 1 {
        Err("Unsupported ROV capability protocol version".into())
      } else if response.ok {
        Ok(response.result.unwrap_or(Value::Null))
      } else {
        Err(response.error.map_or_else(
          || "The ROV rejected the request".into(),
          |error| format!("{}: {}", error.code, error.message),
        ))
      };
      let _ = sender.send(result);
    }
  }
}

struct PendingRequest<'a> {
  state: &'a CapabilityState,
  id: String,
}

impl Drop for PendingRequest<'_> {
  fn drop(&mut self) {
    self.state.remove(&self.id);
  }
}

/// # Errors
/// Returns connection, queue, protocol, validation, or request timeout errors.
pub async fn request(app: &AppHandle, operation: &str, params: Value) -> Reply {
  let state = app.state::<CapabilityState>();
  let (id, receiver) = state.register()?;
  let pending = PendingRequest { state: &state, id };
  let request = CapabilityRequest {
    version: 1,
    request_id: pending.id.clone(),
    operation: operation.into(),
    params,
  };
  let channel = app.state::<MessageSendChannelState>();
  send_message_and_wait(&channel.tx, WebsocketMessage::CapabilityRequest(request), operation)
    .await?;
  timeout(REQUEST_TIMEOUT, receiver)
    .await
    .map_err(|_| {
      format!("ROV request '{operation}' timed out; inspect the debug log before retrying")
    })?
    .map_err(|_| "The ROV request was cancelled".to_string())?
}

pub fn emit_capability_event(app: &AppHandle, event: &str, payload: &Value) {
  if payload.get("version").and_then(Value::as_u64) != Some(1) {
    log_warn!("Ignoring unsupported capability protocol event: {event}");
    return;
  }
  if let Err(error) = app.emit(event, payload) {
    log_warn!("Failed to deliver capability event {event}: {error}");
  }
}

pub fn action_message(id: &str, value: &Value) -> WebsocketMessage {
  WebsocketMessage::CapabilityRequest(CapabilityRequest {
    version: 1,
    request_id: "direction-stream".into(),
    operation: "action.invoke".into(),
    params: serde_json::json!({"id":id,"phase":"press","value":value}),
  })
}

#[cfg(test)]
mod tests {
  // Assertions and propagated fixture errors are the purpose of these tests.
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;

  #[test]
  fn disconnected_requests_are_rejected() {
    assert!(CapabilityState::default().register().is_err());
  }

  #[tokio::test]
  async fn disconnect_cancels_every_pending_request() -> Result<(), String> {
    let state = CapabilityState::default();
    state.set_connected(true);
    let (id, reply) = state.register()?;
    state.set_connected(false);
    assert!(!state.is_pending(&id));
    assert!(reply.await.map_err(|error| error.to_string())?.is_err());
    Ok(())
  }

  #[tokio::test]
  async fn responses_are_correlated_and_consumed_once() -> Result<(), String> {
    let state = CapabilityState::default();
    state.set_connected(true);
    let (id, reply) = state.register()?;
    state.receive(CapabilityResponse {
      version: 1,
      request_id: id.clone(),
      ok: true,
      result: Some(Value::Bool(true)),
      error: None,
    });
    assert_eq!(reply.await.map_err(|error| error.to_string())?, Ok(Value::Bool(true)));
    assert!(!state.is_pending(&id));
    Ok(())
  }

  #[test]
  fn pending_requests_are_bounded_and_dropped_on_cancellation() -> Result<(), String> {
    let state = CapabilityState::default();
    state.set_connected(true);
    let mut receivers = Vec::new();
    for _ in 0..MAX_PENDING_REQUESTS {
      receivers.push(state.register()?);
    }
    assert!(state.register().is_err());
    let (id, _) = receivers.pop().ok_or("missing pending request")?;
    drop(PendingRequest {
      state: &state,
      id: id.clone(),
    });
    assert!(!state.is_pending(&id));
    assert!(state.register().is_ok());
    Ok(())
  }

  #[tokio::test]
  async fn rejected_and_incompatible_responses_are_not_successes() -> Result<(), String> {
    let state = CapabilityState::default();
    state.set_connected(true);
    let (id, reply) = state.register()?;
    state.receive(CapabilityResponse {
      version: 1,
      request_id: id,
      ok: false,
      result: None,
      error: Some(CapabilityError {
        code: "invalid_value".into(),
        message: "Expected a boolean".into(),
      }),
    });
    assert_eq!(
      reply.await.map_err(|error| error.to_string())?,
      Err("invalid_value: Expected a boolean".into())
    );
    let (id, reply) = state.register()?;
    state.receive(CapabilityResponse {
      version: 2,
      request_id: id,
      ok: true,
      result: None,
      error: None,
    });
    assert!(reply.await.map_err(|error| error.to_string())?.is_err());
    Ok(())
  }

  #[test]
  fn direction_uses_the_shared_action_contract() -> Result<(), serde_json::Error> {
    let message = action_message("rov.direction", &serde_json::json!(vec![0.0; 8]));
    let wire = serde_json::to_value(message)?;
    assert_eq!(wire["type"], "capabilityRequest");
    assert_eq!(wire["payload"]["operation"], "action.invoke");
    assert_eq!(wire["payload"]["params"]["id"], "rov.direction");
    Ok(())
  }
}
