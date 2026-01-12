use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum KeyboardKey {
  KeyA,
  KeyB,
  KeyC,
  KeyD,
  KeyE,
  KeyF,
  KeyG,
  KeyH,
  KeyI,
  KeyJ,
  KeyK,
  KeyL,
  KeyM,
  KeyN,
  KeyO,
  KeyP,
  KeyQ,
  KeyR,
  KeyS,
  KeyT,
  KeyU,
  KeyV,
  KeyW,
  KeyX,
  KeyY,
  KeyZ,
  Digit1,
  Digit2,
  Digit3,
  Digit4,
  Digit5,
  Digit6,
  Digit7,
  Digit8,
  Digit9,
  Digit0,
  F1,
  F2,
  F3,
  F4,
  F5,
  F6,
  F7,
  F8,
  F9,
  F10,
  F11,
  F12,
  Enter,
  Escape,
  Backspace,
  Tab,
  Space,
  Minus,
  Equal,
  BracketLeft,
  BracketRight,
  Backslash,
  Semicolon,
  Quote,
  Backquote,
  Comma,
  Period,
  Slash,
  CapsLock,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ControlLeft,
  ShiftLeft,
  AltLeft,
  MetaLeft,
  ControlRight,
  ShiftRight,
  AltRight,
  MetaRight,
  PrintScreen,
  ScrollLock,
  Pause,
  Insert,
  Home,
  PageUp,
  Delete,
  End,
  PageDown,
  NumLock,
  NumpadDivide,
  NumpadMultiply,
  NumpadSubtract,
  NumpadAdd,
  NumpadEnter,
  Numpad1,
  Numpad2,
  Numpad3,
  Numpad4,
  Numpad5,
  Numpad6,
  Numpad7,
  Numpad8,
  Numpad9,
  Numpad0,
  NumpadDecimal,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum GamepadInput {
  Button(u8),
  Axis(u8),
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardBindings {
  pub surge_forward: KeyboardKey,
  pub surge_backward: KeyboardKey,
  pub sway_right: KeyboardKey,
  pub sway_left: KeyboardKey,
  pub heave_up: KeyboardKey,
  pub heave_down: KeyboardKey,
  pub pitch_up: KeyboardKey,
  pub pitch_down: KeyboardKey,
  pub yaw_right: KeyboardKey,
  pub yaw_left: KeyboardKey,
  pub roll_left: KeyboardKey,
  pub roll_right: KeyboardKey,
  pub action1_positive: KeyboardKey,
  pub action1_negative: KeyboardKey,
  pub action2_positive: KeyboardKey,
  pub action2_negative: KeyboardKey,
  pub auto_stabilization: KeyboardKey,
  pub depth_hold: KeyboardKey,
  pub record: KeyboardKey,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GamepadBindings {
  pub surge_forward: GamepadInput,
  pub surge_backward: GamepadInput,
  pub sway_right: GamepadInput,
  pub sway_left: GamepadInput,
  pub heave_up: GamepadInput,
  pub heave_down: GamepadInput,
  pub pitch_up: GamepadInput,
  pub pitch_down: GamepadInput,
  pub yaw_right: GamepadInput,
  pub yaw_left: GamepadInput,
  pub roll_left: GamepadInput,
  pub roll_right: GamepadInput,
  pub action1_positive: GamepadInput,
  pub action1_negative: GamepadInput,
  pub action2_positive: GamepadInput,
  pub action2_negative: GamepadInput,
  pub auto_stabilization: GamepadInput,
  pub depth_hold: GamepadInput,
  pub record: GamepadInput,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum AttitudeIndicator {
  Scientific,
  Dimensional3D,
  Disabled,
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
        surge_forward: KeyboardKey::KeyW,
        surge_backward: KeyboardKey::KeyS,
        sway_right: KeyboardKey::KeyD,
        sway_left: KeyboardKey::KeyA,
        heave_up: KeyboardKey::Space,
        heave_down: KeyboardKey::ShiftLeft,
        pitch_up: KeyboardKey::KeyI,
        pitch_down: KeyboardKey::KeyK,
        yaw_left: KeyboardKey::KeyJ,
        yaw_right: KeyboardKey::KeyL,
        roll_left: KeyboardKey::KeyQ,
        roll_right: KeyboardKey::KeyE,
        action1_positive: KeyboardKey::Digit1,
        action1_negative: KeyboardKey::Digit2,
        action2_positive: KeyboardKey::Digit3,
        action2_negative: KeyboardKey::Digit4,
        auto_stabilization: KeyboardKey::KeyU,
        depth_hold: KeyboardKey::KeyO,
        record: KeyboardKey::KeyR,
      },
      gamepad: GamepadBindings {
        surge_forward: GamepadInput::Axis(0),
        surge_backward: GamepadInput::Axis(0),
        sway_right: GamepadInput::Axis(0),
        sway_left: GamepadInput::Axis(0),
        heave_up: GamepadInput::Button(7),
        heave_down: GamepadInput::Button(6),
        pitch_up: GamepadInput::Axis(2),
        pitch_down: GamepadInput::Axis(2),
        yaw_left: GamepadInput::Axis(2),
        yaw_right: GamepadInput::Axis(2),
        roll_left: GamepadInput::Button(4),
        roll_right: GamepadInput::Button(5),
        action1_positive: GamepadInput::Button(0),
        action1_negative: GamepadInput::Button(1),
        action2_positive: GamepadInput::Button(2),
        action2_negative: GamepadInput::Button(3),
        auto_stabilization: GamepadInput::Button(12),
        depth_hold: GamepadInput::Button(13),
        record: GamepadInput::Button(9),
      },
    }
  }
}
