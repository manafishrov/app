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
  pub action1: String,
  pub action2: String,
  pub stabilize_pitch: String,
  pub stabilize_roll: String,
  pub stabilize_depth: String,
  pub record: String,
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
pub enum AttitudeIndicator {
  Scientific,
  Dimensional3D,
  Disabled,
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
  pub action1: String,
  pub action2: String,
  pub stabilize_pitch: String,
  pub stabilize_roll: String,
  pub stabilize_depth: String,
  pub record: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Config {
  pub auto_update: bool,
  pub attitude_indicator: AttitudeIndicator,
  pub thruster_rpm_overlay: bool,
  pub video_directory: String,
  pub ip_address: String,
  pub webrtc_signaling_api_port: u16,
  pub webrtc_signaling_api_path: String,
  pub web_socket_port: u16,
  pub info_logging: bool,
  pub keyboard: KeyboardBindings,
  pub gamepad: GamepadBindings,
}

impl Default for Config {
  fn default() -> Self {
    let video_directory = if cfg!(target_os = "windows") {
      format!(
        "{}\\Videos\\Manafish",
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\Default".to_string())
      )
    } else if cfg!(target_os = "macos") {
      format!(
        "{}/Movies/Manafish",
        std::env::var("HOME").unwrap_or_else(|_| "/Users/default".to_string())
      )
    } else {
      format!(
        "{}/Videos/Manafish",
        std::env::var("HOME").unwrap_or_else(|_| "/home/user".to_string())
      )
    };

    Config {
      auto_update: false,
      attitude_indicator: AttitudeIndicator::Scientific,
      thruster_rpm_overlay: false,
      video_directory,
      ip_address: "10.10.10.10".to_string(),
      webrtc_signaling_api_port: 1984,
      webrtc_signaling_api_path: "/api/webrtc?src=cam".to_string(),
      web_socket_port: 9000,
      info_logging: false,
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
        action1: "KeyU".to_string(),
        action2: "KeyO".to_string(),
        stabilize_pitch: "Digit1".to_string(),
        stabilize_roll: "Digit2".to_string(),
        stabilize_depth: "Digit3".to_string(),
        record: "KeyR".to_string(),
      },
      gamepad: GamepadBindings {
        move_horizontal: ControlSource::LeftStick,
        move_up: "7".to_string(),
        move_down: "6".to_string(),
        pitch_yaw: ControlSource::RightStick,
        roll_left: "4".to_string(),
        roll_right: "5".to_string(),
        action1: "1".to_string(),
        action2: "2".to_string(),
        stabilize_pitch: "12".to_string(),
        stabilize_roll: "15".to_string(),
        stabilize_depth: "13".to_string(),
        record: "9".to_string(),
      },
    }
  }
}
