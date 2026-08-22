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
  #[serde(default)]
  pub mcu_firmware_version: String,
  #[serde(default)]
  pub esc_firmware_versions: [Option<String>; 8],
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EscFirmwareUpdate {
  pub active: bool,
  pub origin: Option<String>,
  pub stage: String,
  pub progress: u8,
  pub current_esc: Option<u8>,
  pub target_version: Option<String>,
  pub error: Option<String>,
}

impl Default for EscFirmwareUpdate {
  fn default() -> Self {
    Self {
      active: false,
      origin: None,
      stage: "idle".to_string(),
      progress: 0,
      current_esc: None,
      target_version: None,
      error: None,
    }
  }
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
  #[serde(default)]
  pub esc_firmware_update: EscFirmwareUpdate,
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

  /// # Panics
  /// Panics if a status with live device information cannot round-trip through JSON.
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

  /// # Panics
  /// Panics if a legacy status no longer deserializes with safe defaults.
  #[test]
  fn accepts_legacy_status_without_device_info() {
    let status: RovStatus = serde_json::from_str(BASE_STATUS).unwrap();
    let serialized = serde_json::to_value(&status).unwrap();

    assert!(serialized.get("deviceInfo").is_none());
    assert!(!status.pi_undervoltage);
  }

  /// # Panics
  /// Panics if a partially populated device-info frame cannot be read safely.
  #[test]
  fn accepts_partial_device_info() {
    let mut value: serde_json::Value = serde_json::from_str(BASE_STATUS).unwrap();
    value["deviceInfo"] = serde_json::json!({});
    let status: RovStatus =
      serde_json::from_value(value).expect("partial device info should use safe defaults");

    let device_info = status.device_info.expect("device info should be present");
    assert!(device_info.mcu_firmware_version.is_empty());
    assert!(device_info.esc_firmware_versions.iter().all(Option::is_none));
  }
}
