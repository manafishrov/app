use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SystemHealth {
  pub imu_healthy: bool,
  pub pressure_sensor_healthy: bool,
  pub mcu_healthy: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovStatus {
  pub auto_stabilization: bool,
  pub depth_hold: bool,
  pub battery_percentage: u8,
  pub current_draw: i32,
  #[serde(default)]
  pub pi_undervoltage: bool,
  pub health: SystemHealth,
}

#[cfg(test)]
mod tests {
  use super::RovStatus;

  /// # Panics
  /// Panics if an older firmware status no longer deserializes with a safe default.
  #[test]
  fn older_firmware_status_defaults_pi_undervoltage_to_false() {
    let status: RovStatus = serde_json::from_str(
      r#"{
        "autoStabilization": false,
        "depthHold": false,
        "batteryPercentage": 75,
        "currentDraw": 4,
        "health": {
          "imuHealthy": true,
          "pressureSensorHealthy": true,
          "mcuHealthy": true
        }
      }"#,
    )
    .expect("older firmware status should deserialize");

    assert!(!status.pi_undervoltage);
  }
}
