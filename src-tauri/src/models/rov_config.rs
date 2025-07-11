use serde::{Deserialize, Serialize};

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

#[derive(Deserialize, Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Power {
  user_max_power: f32,
  regulator_max_power: f32,
  battery_min_voltage: f32,
  battery_max_voltage: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RovConfig {
  fluid_type: FluidType,
  thruster_pin_setup: ThrusterPinSetup,
  thruster_allocation: ThrusterAllocation,
  regulator: Regulator,
  movement_coefficients: MovementCoefficients,
  power: Power,
}

pub type ThrusterTest = u8;
