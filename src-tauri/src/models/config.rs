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

impl Default for Config {
  fn default() -> Self {
    Config {
      ip: "10.10.10.10".to_string(),
      stream_port: 8889,
      control_port: 5000,
      keyboard: KeyboardBindings {
        move_forward: "W".to_string(),
        move_backward: "S".to_string(),
        move_left: "A".to_string(),
        move_right: "D".to_string(),
        move_up: "Space".to_string(),
        move_down: "LShift".to_string(),
        rotate_left: "Q".to_string(),
        rotate_right: "E".to_string(),
        tilt_up: "I".to_string(),
        tilt_down: "K".to_string(),
        tilt_diagonal_left: "J".to_string(),
        tilt_diagonal_right: "L".to_string(),
      },
      controller: ControllerBindings {
        left_stick: StickAxis {
          x_axis: 0,
          y_axis: 1,
        },
        right_stick: StickAxis {
          x_axis: 2,
          y_axis: 3,
        },
        buttons: ControllerButtons {
          move_up: 4,
          move_down: 6,
          rotate_left: 14,
          rotate_right: 15,
        },
      },
    }
  }
}
