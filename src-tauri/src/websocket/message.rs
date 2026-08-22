use serde::{Deserialize, Serialize};

use crate::models::actions::{CustomAction, DirectionVector};
use crate::models::log::LogEntry;
use crate::models::rov_config::{
  McuBoard, PartialRovConfig, RegulatorSuggestions, RovConfig, ThrusterTest,
};
use crate::models::rov_status::RovStatus;
use crate::models::rov_telemetry::RovTelemetry;
use crate::models::toast::Toast;

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigMutation<T> {
  pub mutation_id: String,
  pub config: T,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ConfigResponse {
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub mutation_id: Option<String>,
  pub config: RovConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  DirectionVector(DirectionVector),
  GetConfig,
  SetConfig(ConfigMutation<PartialRovConfig>),
  ImportConfig(ConfigMutation<serde_json::Value>),
  Config(ConfigResponse),
  StartThrusterTest(ThrusterTest),
  CancelThrusterTest(ThrusterTest),
  StartRegulatorAutoTuning,
  CancelRegulatorAutoTuning,
  RegulatorSuggestions(RegulatorSuggestions),
  ShowToast(Toast),
  LogMessage(LogEntry),
  StatusUpdate(RovStatus),
  Telemetry(RovTelemetry),
  CustomAction(CustomAction),
  SetAutoStabilization(bool),
  SetDepthHold(bool),
  SetDesiredDepth(f32),
  FlashMcuFirmware(McuBoard),
  FlashEscFirmware,
}

#[cfg(test)]
mod tests {
  use super::WebsocketMessage;

  #[test]
  /// # Panics
  ///
  /// Panics if a stabilization command does not serialize to its wire format.
  fn stabilization_messages_include_the_desired_state() {
    assert_eq!(
      serde_json::to_value(WebsocketMessage::SetAutoStabilization(true)).expect("serialize"),
      serde_json::json!({"type": "setAutoStabilization", "payload": true})
    );
    assert_eq!(
      serde_json::to_value(WebsocketMessage::SetDepthHold(false)).expect("serialize"),
      serde_json::json!({"type": "setDepthHold", "payload": false})
    );
  }
}
