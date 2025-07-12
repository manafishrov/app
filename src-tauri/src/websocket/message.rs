use crate::models::{
  log::LogEntry,
  rov_actions::RovMovementCommand,
  rov_config::{FirmwareVersion, Regulator, RovConfig, ThrusterTest},
  rov_status::RovStatus,
  rov_telemetry::RovTelemetry,
  toast::Toast,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  MovementCommand(RovMovementCommand),
  GetConfig,
  SetConfig(RovConfig),
  ConfigResponse(RovConfig),
  StartThrusterTest(ThrusterTest),
  CancelThrusterTest(ThrusterTest),
  StartRegulatorAutoTuning,
  CancelRegulatorAutoTuning,
  RegulatorSuggestions(Regulator),
  ShowToast(Toast),
  LogMessage(LogEntry),
  StatusUpdate(RovStatus),
  Telemetry(RovTelemetry),
  GetFirmwareVersion,
  FirmwareVersionResponse(FirmwareVersion),
}
