use serde::{Deserialize, Serialize};

use super::capabilities::{CapabilityRequest, CapabilityResponse};
use crate::models::log::LogEntry;
use crate::models::rov_config::{McuBoard, PartialRovConfig, RovConfig, ThrusterTest};
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

  #[test]
  /// # Panics
  ///
  /// Panics if messages from firmware that still has regulator auto-tuning stop parsing.
  fn firmware_with_auto_tuning_stays_compatible() {
    let toast = serde_json::json!({"type": "showToast", "payload": {
      "identifier": "auto-tuning",
      "variant": "loading",
      "content": {"messageKey": "toasts_auto_tuning_starting"},
      "action": {"messageType": "cancelRegulatorAutoTuning", "labelKey": "common_cancel"},
    }});
    assert!(matches!(
      serde_json::from_value::<WebsocketMessage>(toast),
      Ok(WebsocketMessage::ShowToast(_))
    ));
    // The handler logs and ignores messages it no longer knows.
    let axis = serde_json::json!({"kp": 1.0, "ki": 0.0, "kd": 0.0, "rate": 1.0});
    let suggestions = serde_json::json!({"type": "regulatorSuggestions", "payload": {
      "pitch": axis, "roll": axis, "yaw": axis, "depth": axis,
    }});
    assert!(serde_json::from_value::<WebsocketMessage>(suggestions).is_err());
  }
}
