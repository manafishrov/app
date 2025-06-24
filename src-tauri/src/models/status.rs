use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Status {
  pub pitch: f32,
  pub roll: f32,
  pub desired_pitch: f32,
  pub desired_roll: f32,
  pub depth: f32,
  pub temperature: f32,
}

impl Default for Status {
  fn default() -> Self {
    Status {
      pitch: 0.0,
      roll: 0.0,
      desired_pitch: 0.0,
      desired_roll: 0.0,
      depth: 0.0,
      temperature: 0.0,
    }
  }
}
