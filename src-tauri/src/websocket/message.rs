use crate::models::{
  log::Log,
  movement::MovementCommand,
  regulator::Regulator,
  states::States,
  status::Status,
  thrusters::{TestThruster, ThrusterAllocation, ThrusterPinSetup},
  toast::Toast,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  LogFirmware(Log),
  Toast(Toast),
  Status(Status),
  States(States),
  MovementCommand(MovementCommand),
  ThrusterPinSetup(ThrusterPinSetup),
  ThrusterAllocation(ThrusterAllocation),
  GetThrusterConfig,
  TestThruster(TestThruster),
  Regulator(Regulator),
  GetRegulatorConfig,
  RegulatorAutoTuning,
}
