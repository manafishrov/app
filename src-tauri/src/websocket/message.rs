use crate::models::{
  actions::RovMovementCommand,
  log::LogEntry,
  rov_config::{FirmwareVersion, RegulatorSuggestions, RovConfig, ThrusterTest},
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
  RegulatorSuggestions(RegulatorSuggestions),
  ShowToast(Toast),
  LogMessage(LogEntry),
  StatusUpdate(RovStatus),
  Telemetry(RovTelemetry),
  GetFirmwareVersion,
  FirmwareVersionResponse(FirmwareVersion),
  RunAction1,
  RunAction2,
  TogglePitchStabilization,
  ToggleRollStabilization,
  ToggleDepthStabilization,
}
