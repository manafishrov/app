use crate::models::{
  log::Log,
  movement::MovementCommand,
  settings::Settings,
  status::Status,
  thrusters::{TestThruster, ThrusterAllocation, ThrusterPinSetup},
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  Status(Status),
  Settings(Settings),
  MovementCommand(MovementCommand),
  LogFirmware(Log),
  ThrusterPinSetup(ThrusterPinSetup),
  ThrusterAllocation(ThrusterAllocation),
  GetThrusterConfig,
  TestThruster(TestThruster),
}
