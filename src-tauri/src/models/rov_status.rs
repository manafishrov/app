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
pub struct EscFirmwareUpdate {
  pub active: bool,
  pub origin: Option<String>,
  pub stage: String,
  pub progress: u8,
  pub current_esc: Option<u8>,
  pub target_version: Option<String>,
  pub error: Option<String>,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovStatus {
  pub auto_stabilization: bool,
  pub depth_hold: bool,
  pub battery_percentage: u8,
  pub current_draw: i32,
  pub pi_undervoltage: bool,
  pub health: SystemHealth,
  pub device_info: DeviceInfo,
  pub esc_firmware_update: EscFirmwareUpdate,
}

#[cfg(test)]
mod tests {
  use super::RovStatus;

  const CURRENT_STATUS: &str = r#"{
    "autoStabilization": false,
    "depthHold": false,
    "batteryPercentage": 75,
    "currentDraw": 12,
    "piUndervoltage": false,
    "health": {
      "imuHealthy": true,
      "pressureSensorHealthy": true,
      "mcuHealthy": true
    },
    "deviceInfo": {
      "mcuFirmwareVersion": "1.2.3-rc.1",
      "escFirmwareVersions": ["2.20.0", null, null, null, null, null, null, null]
    },
    "escFirmwareUpdate": {
      "active": false,
      "origin": null,
      "stage": "idle",
      "progress": 0,
      "currentEsc": null,
      "targetVersion": null,
      "error": null
    }
  }"#;

  /// # Panics
  /// Panics if a status with live device information cannot round-trip through JSON.
  #[test]
  fn preserves_live_device_info() {
    let status: RovStatus = serde_json::from_str(CURRENT_STATUS).unwrap();
    let serialized = serde_json::to_value(&status).unwrap();

    assert_eq!(serialized["deviceInfo"]["mcuFirmwareVersion"], "1.2.3-rc.1");
    assert_eq!(serialized["deviceInfo"]["escFirmwareVersions"][0], "2.20.0");
  }

  /// # Panics
  /// Panics if the current status fixture cannot be parsed as JSON.
  #[test]
  fn rejects_status_without_current_required_fields() {
    for field in ["piUndervoltage", "deviceInfo", "escFirmwareUpdate"] {
      let mut value: serde_json::Value = serde_json::from_str(CURRENT_STATUS).unwrap();
      value.as_object_mut().unwrap().remove(field);

      assert!(
        serde_json::from_value::<RovStatus>(value).is_err(),
        "status without {field} should be rejected"
      );
    }
  }

  /// # Panics
  /// Panics if the current status fixture cannot be parsed as JSON.
  #[test]
  fn rejects_partial_device_info() {
    let mut value: serde_json::Value = serde_json::from_str(CURRENT_STATUS).unwrap();
    value["deviceInfo"] = serde_json::json!({});

    assert!(serde_json::from_value::<RovStatus>(value).is_err());
  }

  /// # Panics
  /// Panics if the current status fixture cannot be parsed as JSON.
  #[test]
  fn rejects_partial_esc_firmware_update() {
    let mut value: serde_json::Value = serde_json::from_str(CURRENT_STATUS).unwrap();
    value["escFirmwareUpdate"] = serde_json::json!({"active": true, "progress": 40});

    assert!(serde_json::from_value::<RovStatus>(value).is_err());
  }
}
