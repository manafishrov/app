use serde::Serialize;

#[derive(Serialize, Clone)]
pub struct GamepadData {
  pub id: usize,
  pub uuid: String,
  pub connected: bool,
  pub vibration: bool,
  pub event: String,
  pub timestamp: u128,
  pub name: String,
  pub buttons: Vec<f32>,
  pub axes: Vec<f32>,
  pub mapping: String,
  pub power_info: String,
}
