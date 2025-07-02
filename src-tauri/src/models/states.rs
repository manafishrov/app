use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct States {
  pub pitch_stabilization: bool,
  pub roll_stabilization: bool,
  pub depth_stabilization: bool,
  pub recording_start_time: Option<u64>,
}
