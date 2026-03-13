#![allow(clippy::struct_field_names)]

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum MicrocontrollerFirmwareVariant {
  Pwm,
  Dshot,
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
  pub user_max_power_thrusters: f32,
  pub user_max_power_actions: f32,
  pub regulator_max_power: f32,
  pub battery_min_voltage: f32,
  pub battery_max_voltage: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovConfig {
  pub firmware_version: String,
  pub microcontroller_firmware_variant: MicrocontrollerFirmwareVariant,
  pub fluid_type: FluidType,
  pub smoothing_factor: f32,
  pub thruster_pin_setup: ThrusterPinSetup,
  pub thruster_allocation: ThrusterAllocation,
  pub regulator: Regulator,
  pub direction_coefficients: DirectionCoefficients,
  pub power: Power,
}

pub type ThrusterTest = u8;

pub type FirmwareVersion = String;

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RegulatorSuggestions {
  pub pitch: AxisConfig,
  pub roll: AxisConfig,
  pub yaw: AxisConfig,
  pub depth: AxisConfig,
}
