use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

use crate::models::rov_telemetry::RovTelemetry;

pub fn handle_telemetry(app_handle: &AppHandle, payload: &RovTelemetry) -> Option<Message> {
  app_handle.emit("rov_telemetry", payload).unwrap();
  None
}
