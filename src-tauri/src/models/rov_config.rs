use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub enum MicroControllerFirmwareVariant {
  Pwm,
  Dshot300,
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
pub struct Pid {
  pub kp: f32,
  pub ki: f32,
  pub kd: f32,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Regulator {
  pub turn_speed: u16,
  pub pitch: Pid,
  pub roll: Pid,
  pub depth: Pid,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DirectionCoefficients {
  pub horizontal: f32,
  pub strafe: f32,
  pub vertical: f32,
  pub pitch: f32,
  pub yaw: f32,
  pub roll: f32,
}

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Power {
  pub user_max_power: f32,
  pub regulator_max_power: f32,
  pub battery_min_voltage: f32,
  pub battery_max_voltage: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovConfig {
  pub microcontroller_firmware_variant: MicroControllerFirmwareVariant,
  pub fluid_type: FluidType,
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
  pub pitch: Pid,
  pub roll: Pid,
  pub depth: Pid,
}
