use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SystemHealth {
  pub imu_healthy: bool,
  pub pressure_sensor_healthy: bool,
  pub microcontroller_healthy: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovStatus {
  pub pitch_stabilization: bool,
  pub roll_stabilization: bool,
  pub depth_hold: bool,
  pub battery_percentage: u8,
  pub health: SystemHealth,
}
