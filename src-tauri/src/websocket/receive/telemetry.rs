use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::log_warn;
use crate::models::rov_telemetry::RovTelemetry;

pub fn handle_telemetry(app_handle: &AppHandle, payload: &RovTelemetry) -> Option<Message> {
  if let Err(error) = app_handle.emit("rov_telemetry", payload) {
    log_warn!("Failed to emit ROV telemetry: {error}");
  }
  None
}
