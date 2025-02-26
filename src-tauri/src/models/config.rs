use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardBindings {
  pub move_forward: String,
  pub move_backward: String,
  pub move_left: String,
  pub move_right: String,
  pub move_up: String,
  pub move_down: String,
  pub rotate_left: String,
  pub rotate_right: String,
  pub tilt_up: String,
  pub tilt_down: String,
  pub tilt_diagonal_left: String,
  pub tilt_diagonal_right: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StickAxis {
  pub x_axis: i32,
  pub y_axis: i32,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerButtons {
  pub move_up: i32,
  pub move_down: i32,
  pub rotate_left: i32,
  pub rotate_right: i32,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ControllerBindings {
  pub left_stick: StickAxis,
  pub right_stick: StickAxis,
  pub buttons: ControllerButtons,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
  pub ip: String,
  pub stream_port: u16,
  pub control_port: u16,
  pub keyboard: KeyboardBindings,
  pub controller: ControllerBindings,
}
