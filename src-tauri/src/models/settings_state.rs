use crate::models::regulator::Regulator;
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SettingsState {
  regulator_suggestion: Option<Regulator>,
  thruster_testing: bool,
}
