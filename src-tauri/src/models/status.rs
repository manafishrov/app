use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Status {
  pub is_connected: bool,
  pub water_detected: bool,
  pub pitch: f32,
  pub roll: f32,
  pub desired_pitch: f32,
  pub desired_roll: f32,
}

impl Default for Status {
  fn default() -> Self {
    Status {
      is_connected: false,
      water_detected: false,
      pitch: 0.0,
      roll: 0.0,
      desired_pitch: 0.0,
      desired_roll: 0.0,
    }
  }
}
