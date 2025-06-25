use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
  pub pitch_stabalizon: bool,
  pub roll_stabalizon: bool,
  pub depth_stabalizon: bool,
}

impl Default for Settings {
  fn default() -> Self {
    Settings {
      pitch_stabalizon: true,
      roll_stabalizon: true,
      depth_stabalizon: true,
    }
  }
}
