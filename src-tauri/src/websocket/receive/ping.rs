use serde_json::Value;
use tauri::{AppHandle, Emitter};
use tokio_tungstenite::tungstenite::Message;

pub fn handle_ping(app_handle: &AppHandle, payload: &Value) -> Option<Message> {
  println!("Received ping with payload: {}", payload);
  app_handle.emit("ping-event", payload).unwrap();
  None
}

