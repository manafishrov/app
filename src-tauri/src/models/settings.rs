use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
  pub pitch_stabilization: bool,
  pub roll_stabilization: bool,
  pub depth_stabilization: bool,
}

impl Default for Settings {
  fn default() -> Self {
    Settings {
      pitch_stabilization: true,
      roll_stabilization: true,
      depth_stabilization: true,
    }
  }
}
