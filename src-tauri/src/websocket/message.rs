use serde::{Deserialize, Serialize};

use crate::models::actions::{CustomAction, DirectionVector};
use crate::models::log::LogEntry;
use crate::models::rov_config::{
  FirmwareVersion, MicrocontrollerFirmwareVariant, RegulatorSuggestions, RovConfig, ThrusterTest,
};
use crate::models::rov_status::RovStatus;
use crate::models::rov_telemetry::RovTelemetry;
use crate::models::toast::Toast;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  DirectionVector(DirectionVector),
  GetConfig,
  SetConfig(RovConfig),
  Config(RovConfig),
  StartThrusterTest(ThrusterTest),
  CancelThrusterTest(ThrusterTest),
  StartRegulatorAutoTuning,
  CancelRegulatorAutoTuning,
  RegulatorSuggestions(RegulatorSuggestions),
  ShowToast(Toast),
  LogMessage(LogEntry),
  StatusUpdate(RovStatus),
  Telemetry(RovTelemetry),
  FirmwareVersion(FirmwareVersion),
  CustomAction(CustomAction),
  ToggleAutoStabilization,
  ToggleDepthHold,
  SetDesiredDepth(f32),
  FlashMicrocontrollerFirmware(MicrocontrollerFirmwareVariant),
}
