use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum LogLevel {
  Info,
  Warn,
  Error,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Log {
  pub level: LogLevel,
  pub message: String,
}
