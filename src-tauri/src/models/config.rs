use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardBindings {
  pub surge_forward: String,
  pub surge_backward: String,
  pub sway_left: String,
  pub sway_right: String,
  pub heave_up: String,
  pub heave_down: String,
  pub yaw_left: String,
  pub yaw_right: String,
  pub pitch_up: String,
  pub pitch_down: String,
  pub roll_left: String,
  pub roll_right: String,
  pub action1_positive: String,
  pub action1_negative: String,
  pub action2_positive: String,
  pub action2_negative: String,
  pub pitch_stabilization: String,
  pub roll_stabilization: String,
  pub depth_hold: String,
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
  pub surge_sway: ControlSource,
  pub heave_up: String,
  pub heave_down: String,
  pub pitch_yaw: ControlSource,
  pub roll_left: String,
  pub roll_right: String,
  pub action1_positive: String,
  pub action1_negative: String,
  pub action2_positive: String,
  pub action2_negative: String,
  pub pitch_stabilization: String,
  pub roll_stabilization: String,
  pub depth_hold: String,
  pub record: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
  pub auto_update: bool,
  pub attitude_indicator: AttitudeIndicator,
  pub work_indicator: bool,
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
      work_indicator: false,
      thruster_rpm_overlay: false,
      video_directory,
      ip_address: "10.10.10.10".to_string(),
      webrtc_signaling_api_port: 1984,
      webrtc_signaling_api_path: "/api/webrtc?src=cam".to_string(),
      web_socket_port: 9000,
      info_logging: false,
      keyboard: KeyboardBindings {
        surge_forward: "KeyW".to_string(),
        surge_backward: "KeyS".to_string(),
        sway_left: "KeyA".to_string(),
        sway_right: "KeyD".to_string(),
        heave_up: "Space".to_string(),
        heave_down: "ShiftLeft".to_string(),
        pitch_up: "KeyI".to_string(),
        pitch_down: "KeyK".to_string(),
        yaw_left: "KeyJ".to_string(),
        yaw_right: "KeyL".to_string(),
        roll_left: "KeyQ".to_string(),
        roll_right: "KeyE".to_string(),
        action1_positive: "Digit1".to_string(),
        action1_negative: "Digit2".to_string(),
        action2_positive: "Digit3".to_string(),
        action2_negative: "Digit4".to_string(),
        pitch_stabilization: "KeyU".to_string(),
        roll_stabilization: "KeyU".to_string(),
        depth_hold: "KeyO".to_string(),
        record: "KeyR".to_string(),
      },
      gamepad: GamepadBindings {
        surge_sway: ControlSource::LeftStick,
        heave_up: "7".to_string(),
        heave_down: "6".to_string(),
        pitch_yaw: ControlSource::RightStick,
        roll_left: "4".to_string(),
        roll_right: "5".to_string(),
        action1_positive: "0".to_string(),
        action1_negative: "1".to_string(),
        action2_positive: "2".to_string(),
        action2_negative: "3".to_string(),
        pitch_stabilization: "12".to_string(),
        roll_stabilization: "12".to_string(),
        depth_hold: "13".to_string(),
        record: "9".to_string(),
      },
    }
  }
}
