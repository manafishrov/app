use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Pid {
  pub kp: f32,
  pub ki: f32,
  pub kd: f32,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Regulator {
  pub pitch: Pid,
  pub roll: Pid,
  pub depth: Pid,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MovementCoefficients {
  horizontal: f32,
  strafe: f32,
  vertical: f32,
  pitch: f32,
  yaw: f32,
  roll: f32,
}
