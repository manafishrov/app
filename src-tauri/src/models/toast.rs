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
  pub message_key: String,
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
