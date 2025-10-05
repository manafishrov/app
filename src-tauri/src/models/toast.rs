use serde::{Deserialize, Serialize};
use crate::models::rov_config::ThrusterTest;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ToastType {
  Success,
  Info,
  Warn,
  Error,
  Loading,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(tag = "type", content = "payload", rename_all = "camelCase")]
pub enum ToastCancel {
  CancelThrusterTest(ThrusterTest),
  CancelRegulatorAutoTuning,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Toast {
  pub id: Option<String>,
  pub toast_type: Option<ToastType>,
  pub message: String,
  pub description: Option<String>,
  pub cancel: Option<ToastCancel>,
}
