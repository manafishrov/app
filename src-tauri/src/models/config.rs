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
        move_forward: "KeyW".to_string(),
        move_backward: "KeyS".to_string(),
        move_left: "KeyA".to_string(),
        move_right: "KeyD".to_string(),
        move_up: "Space".to_string(),
        move_down: "ShiftLeft".to_string(),
        pitch_up: "KeyI".to_string(),
        pitch_down: "KeyK".to_string(),
        yaw_left: "KeyJ".to_string(),
        yaw_right: "KeyL".to_string(),
        roll_left: "KeyQ".to_string(),
        roll_right: "KeyE".to_string(),
      },
      gamepad: GamepadBindings {
        move_horizontal: ControlSource::LeftStick,
        move_up: "7".to_string(),
        move_down: "6".to_string(),
        pitch_yaw: ControlSource::RightStick,
        roll_left: "4".to_string(),
        roll_right: "5".to_string(),
      },
    }
  }
}
