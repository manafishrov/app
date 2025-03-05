use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardBindings {
  pub move_forward: String,
  pub move_backward: String,
  pub move_left: String,
  pub move_right: String,
  pub move_up: String,
  pub move_down: String,
  pub yaw_left: String,
  pub yaw_right: String,
  pub pitch_up: String,
  pub pitch_down: String,
  pub roll_left: String,
  pub roll_right: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum ControlSource {
  LeftStick,
  RightStick,
  DPad,
  FaceButtons,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GamepadBindings {
  pub move_horizontal: ControlSource,
  pub move_up: String,
  pub move_down: String,
  pub pitch_yaw: ControlSource,
  pub roll_left: String,
  pub roll_right: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Config {
  pub ip_address: String,
  pub camera_stream_port: u16,
  pub device_controls_port: u16,
  pub keyboard: KeyboardBindings,
  pub gamepad: GamepadBindings,
}

impl Default for Config {
  fn default() -> Self {
    Config {
      ip_address: "10.10.10.10".to_string(),
      camera_stream_port: 8889,
      device_controls_port: 5000,
      keyboard: KeyboardBindings {
        move_forward: "W".to_string(),
        move_backward: "S".to_string(),
        move_left: "A".to_string(),
        move_right: "D".to_string(),
        move_up: "Space".to_string(),
        move_down: "Shift".to_string(),
        pitch_up: "I".to_string(),
        pitch_down: "K".to_string(),
        yaw_left: "J".to_string(),
        yaw_right: "L".to_string(),
        roll_left: "Q".to_string(),
        roll_right: "E".to_string(),
      },
      gamepad: GamepadBindings {
        move_horizontal: ControlSource::LeftStick,
        move_up: "9".to_string(),
        move_down: "10".to_string(),
        pitch_yaw: ControlSource::RightStick,
        roll_left: "7".to_string(),
        roll_right: "8".to_string(),
      },
    }
  }
}
