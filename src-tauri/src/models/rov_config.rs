use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum McuBoard {
  Pico,
  Pico2,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum ThrusterProtocol {
  Pwm,
  Dshot,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum CurrentSensingMode {
  PerMotor,
  SharedBus,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum FluidType {
  Saltwater,
  Freshwater,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ThrusterPinSetup {
  pub identifiers: [u8; 8],
  pub spin_directions: [i8; 8],
}

pub type ThrusterAllocation = [[f32; 8]; 8];

pub type NullspaceVectors = Vec<[f32; 8]>;

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AxisConfig {
  pub kp: f32,
  pub ki: f32,
  pub kd: f32,
  pub rate: f32,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Regulator {
  pub pitch: AxisConfig,
  pub roll: AxisConfig,
  pub yaw: AxisConfig,
  pub depth: AxisConfig,
  pub fpv_mode: bool,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DirectionCoefficients {
  pub surge: f32,
  pub sway: f32,
  pub heave: f32,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Power {
  pub thrusters_limit: f32,
  pub actions_limit: f32,
  pub regulator_limit: f32,
  pub min_battery_voltage: f32,
  pub max_battery_voltage: f32,
  pub internal_resistance: f32,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Camera {
  pub width: u32,
  pub height: u32,
  pub framerate: u32,
  pub bitrate: u32,
  pub keyframe_interval: u32,
  pub profile: String,
  pub level: String,
  pub rotation: u32,
  pub hflip: bool,
  pub vflip: bool,
  pub awb: String,
  pub exposure_value: f32,
  pub brightness: f32,
  pub contrast: f32,
  pub saturation: f32,
  pub sharpness: f32,
  pub denoise: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovConfig {
  pub firmware_version: String,
  pub mcu_firmware_version: String,
  pub rov_name: String,
  pub mcu_board: McuBoard,
  pub thruster_protocol: ThrusterProtocol,
  pub dshot_speed: u16,
  pub current_sensing_mode: CurrentSensingMode,
  pub fluid_type: FluidType,
  pub smoothing_factor: f32,
  pub thruster_pin_setup: ThrusterPinSetup,
  pub thruster_allocation: ThrusterAllocation,
  pub nullspace_vectors: NullspaceVectors,
  pub regulator: Regulator,
  pub direction_coefficients: DirectionCoefficients,
  pub power: Power,
  pub camera: Camera,
  pub ip_address: String,
  pub websocket_port: u16,
}

pub type ThrusterTest = u8;

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegulatorSuggestions {
  pub pitch: AxisConfig,
  pub roll: AxisConfig,
  pub yaw: AxisConfig,
  pub depth: AxisConfig,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PartialRovConfig {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub firmware_version: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub mcu_firmware_version: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub rov_name: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub mcu_board: Option<McuBoard>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub thruster_protocol: Option<ThrusterProtocol>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub dshot_speed: Option<u16>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub current_sensing_mode: Option<CurrentSensingMode>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub fluid_type: Option<FluidType>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub smoothing_factor: Option<f32>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub thruster_pin_setup: Option<ThrusterPinSetup>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub thruster_allocation: Option<ThrusterAllocation>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub nullspace_vectors: Option<NullspaceVectors>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub regulator: Option<Regulator>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub direction_coefficients: Option<DirectionCoefficients>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub power: Option<Power>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub camera: Option<Camera>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ip_address: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub websocket_port: Option<u16>,
}

#[cfg(test)]
mod tests {
  use super::*;
  use serde::Serialize;
  use serde_json::json;

  /// # Panics
  /// Panics if enum serialization fails or uses unexpected camelCase strings.
  fn assert_serializes_to_expected_string<T>(value: T, expected: &str)
  where
    T: Serialize,
  {
    let serialized = serde_json::to_value(value);
    assert!(serialized.is_ok(), "Enum serialization failed: {serialized:?}");

    if let Ok(serialized) = serialized {
      assert_eq!(serialized, json!(expected));
    }
  }

  /// # Panics
  /// Panics if the helper values differ from the expected floating-point value.
  fn sample_axis_config() -> AxisConfig {
    AxisConfig {
      kp: 1.5,
      ki: 0.25,
      kd: 0.05,
      rate: 60.0,
    }
  }

  fn sample_thruster_pin_setup() -> ThrusterPinSetup {
    ThrusterPinSetup {
      identifiers: [1, 2, 3, 4, 5, 6, 7, 8],
      spin_directions: [1, -1, 1, -1, 1, -1, 1, -1],
    }
  }

  fn sample_camera() -> Camera {
    Camera {
      width: 1920,
      height: 1080,
      framerate: 30,
      bitrate: 20_000_000,
      keyframe_interval: 30,
      profile: "baseline".to_string(),
      level: "4.2".to_string(),
      rotation: 0,
      hflip: false,
      vflip: true,
      awb: "auto".to_string(),
      exposure_value: 0.0,
      brightness: 0.0,
      contrast: 1.0,
      saturation: 1.0,
      sharpness: 1.0,
      denoise: "auto".to_string(),
    }
  }

  fn sample_thruster_allocation() -> ThrusterAllocation {
    [
      [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0],
      [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0],
      [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0],
    ]
  }

  fn sample_rov_config() -> RovConfig {
    RovConfig {
      firmware_version: "1.2.3".to_string(),
      mcu_firmware_version: "4.5.6".to_string(),
      rov_name: "Manafish".to_string(),
      mcu_board: McuBoard::Pico2,
      thruster_protocol: ThrusterProtocol::Dshot,
      dshot_speed: 600,
      current_sensing_mode: CurrentSensingMode::PerMotor,
      fluid_type: FluidType::Saltwater,
      smoothing_factor: 0.4,
      thruster_pin_setup: sample_thruster_pin_setup(),
      thruster_allocation: sample_thruster_allocation(),
      nullspace_vectors: vec![
        [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
        [0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1],
      ],
      regulator: Regulator {
        pitch: sample_axis_config(),
        roll: sample_axis_config(),
        yaw: sample_axis_config(),
        depth: sample_axis_config(),
        fpv_mode: true,
      },
      direction_coefficients: DirectionCoefficients {
        surge: 1.0,
        sway: 0.8,
        heave: 0.6,
      },
      power: Power {
        thrusters_limit: 0.9,
        actions_limit: 0.7,
        regulator_limit: 0.8,
        min_battery_voltage: 14.0,
        max_battery_voltage: 16.8,
        internal_resistance: 0.02,
      },
      camera: sample_camera(),
      ip_address: "10.10.10.10".to_string(),
      websocket_port: 9000,
    }
  }

  /// # Panics
  /// Panics if the JSON number is missing or differs from the expected value.
  fn assert_json_f64_eq(value: &serde_json::Value, expected: f64) {
    const EPSILON: f64 = 1e-6;

    let actual = value.as_f64();
    assert!(actual.is_some());

    let Some(actual) = actual else {
      return;
    };

    assert!((actual - expected).abs() <= EPSILON);
  }

  /// # Panics
  /// Panics if serialization or deserialization changes the thruster pin
  /// setup payload.
  #[test]
  fn thruster_pin_setup_serialization_round_trip_preserves_values() {
    let setup = sample_thruster_pin_setup();

    let serialized = serde_json::to_value(&setup);
    assert!(serialized.is_ok(), "ThrusterPinSetup serialization failed: {serialized:?}");
    let Ok(serialized) = serialized else {
      return;
    };

    assert_eq!(
      serialized,
      json!({
        "identifiers": [1, 2, 3, 4, 5, 6, 7, 8],
        "spinDirections": [1, -1, 1, -1, 1, -1, 1, -1],
      })
    );

    let deserialized = serde_json::from_value::<ThrusterPinSetup>(serialized.clone());
    assert!(
      deserialized.is_ok(),
      "ThrusterPinSetup deserialization failed: {deserialized:?}"
    );
    let Ok(deserialized) = deserialized else {
      return;
    };

    let reserialized = serde_json::to_value(&deserialized);
    assert!(
      reserialized.is_ok(),
      "ThrusterPinSetup reserialization failed: {reserialized:?}"
    );
    let Ok(reserialized) = reserialized else {
      return;
    };

    assert_eq!(serialized, reserialized);
  }

  /// # Panics
  /// Panics if the serialized field names or round-trip values differ from the
  /// expected axis configuration.
  #[test]
  fn axis_config_serialization_round_trip_uses_expected_json_fields() {
    let axis = sample_axis_config();

    let serialized = serde_json::to_value(&axis);
    assert!(serialized.is_ok(), "AxisConfig serialization failed: {serialized:?}");
    let Ok(serialized) = serialized else {
      return;
    };

    assert!(serialized.get("kp").is_some());
    assert!(serialized.get("ki").is_some());
    assert!(serialized.get("kd").is_some());
    assert!(serialized.get("rate").is_some());
    assert!(serialized.get("kP").is_none());
    assert!(serialized.get("k_i").is_none());

    let Some(kp) = serialized.get("kp") else {
      return;
    };
    let Some(ki) = serialized.get("ki") else {
      return;
    };
    let Some(kd) = serialized.get("kd") else {
      return;
    };
    let Some(rate) = serialized.get("rate") else {
      return;
    };

    assert_json_f64_eq(kp, 1.5);
    assert_json_f64_eq(ki, 0.25);
    assert_json_f64_eq(kd, 0.05);
    assert_json_f64_eq(rate, 60.0);

    let deserialized = serde_json::from_value::<AxisConfig>(serialized.clone());
    assert!(deserialized.is_ok(), "AxisConfig deserialization failed: {deserialized:?}");
    let Ok(deserialized) = deserialized else {
      return;
    };

    let reserialized = serde_json::to_value(&deserialized);
    assert!(reserialized.is_ok(), "AxisConfig reserialization failed: {reserialized:?}");
    let Ok(reserialized) = reserialized else {
      return;
    };

    assert_eq!(serialized, reserialized);
  }

  /// # Panics
  /// Panics if serialization or deserialization changes any ROV config field.
  #[test]
  fn rov_config_serialization_round_trip_preserves_values() {
    let config = sample_rov_config();

    let serialized = serde_json::to_value(&config);
    assert!(serialized.is_ok(), "RovConfig serialization failed: {serialized:?}");
    let Ok(serialized) = serialized else {
      return;
    };

    let deserialized = serde_json::from_value::<RovConfig>(serialized.clone());
    assert!(deserialized.is_ok(), "RovConfig deserialization failed: {deserialized:?}");
    let Ok(deserialized) = deserialized else {
      return;
    };

    let reserialized = serde_json::to_value(&deserialized);
    assert!(reserialized.is_ok(), "RovConfig reserialization failed: {reserialized:?}");
    let Ok(reserialized) = reserialized else {
      return;
    };

    assert_eq!(serialized, reserialized);
  }

  /// # Panics
  /// Panics if `None` fields are serialized or the populated fields are not
  /// preserved.
  #[test]
  fn partial_rov_config_serialization_skips_none_fields() {
    let partial = PartialRovConfig {
      rov_name: Some("Manafish".to_string()),
      websocket_port: Some(9000),
      ..PartialRovConfig::default()
    };

    let serialized = serde_json::to_value(&partial);
    assert!(serialized.is_ok(), "PartialRovConfig serialization failed: {serialized:?}");
    let Ok(serialized) = serialized else {
      return;
    };

    assert_eq!(serialized, json!({ "rovName": "Manafish", "websocketPort": 9000 }));
    assert!(serialized.get("firmwareVersion").is_none());
    assert!(serialized.get("thrusterPinSetup").is_none());
  }

  /// # Panics
  /// Panics if any default partial config field is set or if serialization does
  /// not produce an empty object.
  #[test]
  fn partial_rov_config_default_starts_with_all_fields_unset() {
    let partial = PartialRovConfig::default();

    assert!(partial.firmware_version.is_none());
    assert!(partial.mcu_firmware_version.is_none());
    assert!(partial.rov_name.is_none());
    assert!(partial.mcu_board.is_none());
    assert!(partial.thruster_protocol.is_none());
    assert!(partial.dshot_speed.is_none());
    assert!(partial.current_sensing_mode.is_none());
    assert!(partial.fluid_type.is_none());
    assert!(partial.smoothing_factor.is_none());
    assert!(partial.thruster_pin_setup.is_none());
    assert!(partial.thruster_allocation.is_none());
    assert!(partial.nullspace_vectors.is_none());
    assert!(partial.regulator.is_none());
    assert!(partial.direction_coefficients.is_none());
    assert!(partial.power.is_none());
    assert!(partial.ip_address.is_none());
    assert!(partial.websocket_port.is_none());

    let serialized = serde_json::to_value(&partial);
    assert!(serialized.is_ok(), "PartialRovConfig serialization failed: {serialized:?}");
    let Ok(serialized) = serialized else {
      return;
    };

    assert_eq!(serialized, json!({}));
  }

  /// # Panics
  /// Panics if enum variants do not serialize to the expected camelCase
  /// strings.
  #[test]
  fn enum_variants_serialize_to_expected_strings() {
    assert_serializes_to_expected_string(McuBoard::Pico, "pico");
    assert_serializes_to_expected_string(McuBoard::Pico2, "pico2");
    assert_serializes_to_expected_string(ThrusterProtocol::Pwm, "pwm");
    assert_serializes_to_expected_string(ThrusterProtocol::Dshot, "dshot");
    assert_serializes_to_expected_string(CurrentSensingMode::PerMotor, "perMotor");
    assert_serializes_to_expected_string(CurrentSensingMode::SharedBus, "sharedBus");
    assert_serializes_to_expected_string(FluidType::Saltwater, "saltwater");
    assert_serializes_to_expected_string(FluidType::Freshwater, "freshwater");
  }
}
