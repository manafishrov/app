use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
  pub pitch_stabilization: bool,
  pub roll_stabilization: bool,
  pub depth_stabilization: bool,
}
