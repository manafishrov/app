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
pub struct DeviceInfo {
  pub mcu_firmware_version: String,
  pub esc_firmware_versions: [Option<String>; 8],
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
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub device_info: Option<DeviceInfo>,
}

#[cfg(test)]
mod tests {
  use super::RovStatus;

  const BASE_STATUS: &str = r#"{
    "autoStabilization": false,
    "depthHold": false,
    "batteryPercentage": 75,
    "currentDraw": 12,
    "health": {
      "imuHealthy": true,
      "pressureSensorHealthy": true,
      "mcuHealthy": true
    }
  }"#;

  #[test]
  fn preserves_live_device_info() {
    let mut value: serde_json::Value = serde_json::from_str(BASE_STATUS).unwrap();
    value["deviceInfo"] = serde_json::json!({
      "mcuFirmwareVersion": "1.2.3",
      "escFirmwareVersions": ["2.20.0", null, null, null, null, null, null, null]
    });

    let status: RovStatus = serde_json::from_value(value).unwrap();
    let serialized = serde_json::to_value(&status).unwrap();

    assert_eq!(serialized["deviceInfo"]["mcuFirmwareVersion"], "1.2.3");
    assert_eq!(serialized["deviceInfo"]["escFirmwareVersions"][0], "2.20.0");
  }

  #[test]
  fn accepts_legacy_status_without_device_info() {
    let status: RovStatus = serde_json::from_str(BASE_STATUS).unwrap();
    let serialized = serde_json::to_value(&status).unwrap();

    assert!(serialized.get("deviceInfo").is_none());
    assert!(!status.pi_undervoltage);
  }
}
