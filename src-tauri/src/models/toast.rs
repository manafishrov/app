use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ToastVariant {
  Success,
  Info,
  Warn,
  Error,
  Loading,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ToastAction {
  pub label_key: Option<String>,
  pub label_args: Option<HashMap<String, Value>>,
  pub message_type: String,
  pub payload: Option<Value>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ToastContent {
  #[serde(default)]
  pub message_key: String,
  pub message: Option<String>,
  pub description: Option<String>,
  pub message_args: Option<HashMap<String, Value>>,
  pub description_key: Option<String>,
  pub description_args: Option<HashMap<String, Value>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Toast {
  pub identifier: Option<String>,
  pub variant: Option<ToastVariant>,
  pub content: ToastContent,
  pub action: Option<ToastAction>,
}

#[cfg(test)]
mod tests {
  // Assertions and propagated fixture errors are the purpose of these tests.
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::Toast;
  use serde_json::json;

  #[test]
  fn forwards_plain_sdk_notifications_and_localized_firmware_toasts() {
    for content in [
      json!({"message": "Water detected", "description": "Check housing"}),
      json!({"messageKey": "toasts_water_sensor_wet_title"}),
    ] {
      let payload = json!({"identifier": "custom-action:sensor:wet", "variant": "warn", "content": content, "action": null});
      let toast: Toast = serde_json::from_value(payload).unwrap();
      let output = serde_json::to_value(toast).unwrap();
      for (key, value) in content.as_object().unwrap() {
        assert_eq!(&output["content"][key], value);
      }
    }
  }
}
