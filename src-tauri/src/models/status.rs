use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct Status {
  pub is_connected: bool,
  pub water_detected: bool,
  pub pitch: f32,
  pub roll: f32,
}

impl Default for Status {
  fn default() -> Self {
    Status {
      is_connected: false,
      water_detected: false,
      pitch: 0.0,
      roll: 0.0,
    }
  }
}
