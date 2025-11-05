use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovTelemetry {
  pub pitch: f32,
  pub roll: f32,
  pub desired_pitch: f32,
  pub desired_roll: f32,
  pub thruster_rpms: [f32; 8],
  pub work_indicator_percentage: u8,
}
