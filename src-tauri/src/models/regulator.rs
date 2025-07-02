use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Regulator {
  pub speed_coefficient: f32,
  pub kp: f32,
  pub ki: f32,
  pub kd: f32,
}
