use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum LogLevel {
  Info,
  Warn,
  Error,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum LogOrigin {
  Firmware,
  Backend,
  Frontend,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
  pub level: LogLevel,
  pub origin: LogOrigin,
  pub message: String,
}
