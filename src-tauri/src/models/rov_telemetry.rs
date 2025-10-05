use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovTelemetry {
  pub pitch: f32,
  pub roll: f32,
  pub desired_pitch: f32,
  pub desired_roll: f32,
  pub depth: f32,
  pub temperature: f32,
  pub thruster_rpms: [f32; 8],
}
