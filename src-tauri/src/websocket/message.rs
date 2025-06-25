use crate::models::{debug::Debug, settings::Settings, status::Status};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  Status(Status),
  Settings(Settings),
  MovementCommand([f32; 6]),
  DebugFirmware(Debug),
}
