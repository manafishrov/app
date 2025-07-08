use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ToastType {
  Success,
  Info,
  Warn,
  Error,
  Loading,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Cancel {
  pub command: String,
  pub payload: Option<Value>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Toast {
  pub id: Option<String>,
  pub toast_type: Option<ToastType>,
  pub message: String,
  pub description: Option<String>,
  pub cancel: Option<Cancel>,
}
