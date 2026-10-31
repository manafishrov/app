use serde::{Deserialize, Serialize};

use super::capabilities::{CapabilityRequest, CapabilityResponse};
use crate::models::log::LogEntry;
use crate::models::rov_config::{
  McuBoard, PartialRovConfig, RegulatorSuggestions, RovConfig, ThrusterTest,
};
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
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub error: Option<String>,
  pub config: RovConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum WebsocketMessage {
  CapabilityRequest(CapabilityRequest),
  CapabilityResponse(CapabilityResponse),
  CapabilityCatalog(serde_json::Value),
  CapabilitySamples(serde_json::Value),
  GetConfig,
  SetConfig(ConfigMutation<PartialRovConfig>),
  ImportConfig(ConfigMutation<serde_json::Value>),
  Config(ConfigResponse),
  ConfirmConfig(String),
  StartThrusterTest(ThrusterTest),
  CancelThrusterTest(ThrusterTest),
  StartRegulatorAutoTuning,
  CancelRegulatorAutoTuning,
  RegulatorSuggestions(RegulatorSuggestions),
  ShowToast(Toast),
  LogMessage(LogEntry),
  FlashMcuFirmware(McuBoard),
  FlashEscFirmware,
}

#[cfg(test)]
mod tests {
  use super::WebsocketMessage;

  #[test]
  /// # Panics
  ///
  /// Panics if a config acknowledgement does not serialize to its wire format.
  fn config_confirmation_includes_the_mutation_id() {
    assert_eq!(
      serde_json::to_value(WebsocketMessage::ConfirmConfig("mutation-1".to_string()))
        .expect("serialize"),
      serde_json::json!({"type": "confirmConfig", "payload": "mutation-1"})
    );
  }
}
