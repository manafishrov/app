use std::collections::HashMap;

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
pub enum GamepadInputType {
  Button(u8),
  Axis(u8),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardInput {
  pub key: KeyboardKey,
  pub min_value: f32,
  pub max_value: f32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GamepadInput {
  pub input: GamepadInputType,
  pub min_value: f32,
  pub max_value: f32,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct KeyboardBindings {
  pub surge_forward: Option<KeyboardInput>,
  pub surge_backward: Option<KeyboardInput>,
  pub sway_right: Option<KeyboardInput>,
  pub sway_left: Option<KeyboardInput>,
  pub heave_up: Option<KeyboardInput>,
  pub heave_down: Option<KeyboardInput>,
  pub pitch_up: Option<KeyboardInput>,
  pub pitch_down: Option<KeyboardInput>,
  pub yaw_right: Option<KeyboardInput>,
  pub yaw_left: Option<KeyboardInput>,
  pub roll_left: Option<KeyboardInput>,
  pub roll_right: Option<KeyboardInput>,
  pub action1_positive: Option<KeyboardInput>,
  pub action1_negative: Option<KeyboardInput>,
  pub action2_positive: Option<KeyboardInput>,
  pub action2_negative: Option<KeyboardInput>,
  pub auto_stabilization: Option<KeyboardInput>,
  pub depth_hold: Option<KeyboardInput>,
  pub record: Option<KeyboardInput>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GamepadBindings {
  pub surge_forward: Option<GamepadInput>,
  pub surge_backward: Option<GamepadInput>,
  pub sway_right: Option<GamepadInput>,
  pub sway_left: Option<GamepadInput>,
  pub heave_up: Option<GamepadInput>,
  pub heave_down: Option<GamepadInput>,
  pub pitch_up: Option<GamepadInput>,
  pub pitch_down: Option<GamepadInput>,
  pub yaw_right: Option<GamepadInput>,
  pub yaw_left: Option<GamepadInput>,
  pub roll_left: Option<GamepadInput>,
  pub roll_right: Option<GamepadInput>,
  pub action1_positive: Option<GamepadInput>,
  pub action1_negative: Option<GamepadInput>,
  pub action2_positive: Option<GamepadInput>,
  pub action2_negative: Option<GamepadInput>,
  pub auto_stabilization: Option<GamepadInput>,
  pub depth_hold: Option<GamepadInput>,
  pub record: Option<GamepadInput>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub enum AttitudeIndicator {
  Scientific,
  Model3D,
  Classic,
  Disabled,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
  pub app_version: String,
  pub overlay_scale: i8,
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
  pub selected_gamepad_id: Option<String>,
  pub gamepad: HashMap<String, GamepadBindings>,
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
      app_version: env!("CARGO_PKG_VERSION").to_string(),
      overlay_scale: 2,
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
        surge_forward: Some(KeyboardInput {
          key: KeyboardKey::KeyW,
          min_value: 0.0,
          max_value: 1.0,
        }),
        surge_backward: Some(KeyboardInput {
          key: KeyboardKey::KeyS,
          min_value: 0.0,
          max_value: 1.0,
        }),
        sway_right: Some(KeyboardInput {
          key: KeyboardKey::KeyD,
          min_value: 0.0,
          max_value: 1.0,
        }),
        sway_left: Some(KeyboardInput {
          key: KeyboardKey::KeyA,
          min_value: 0.0,
          max_value: 1.0,
        }),
        heave_up: Some(KeyboardInput {
          key: KeyboardKey::Space,
          min_value: 0.0,
          max_value: 1.0,
        }),
        heave_down: Some(KeyboardInput {
          key: KeyboardKey::ShiftLeft,
          min_value: 0.0,
          max_value: 1.0,
        }),
        pitch_up: Some(KeyboardInput {
          key: KeyboardKey::KeyI,
          min_value: 0.0,
          max_value: 1.0,
        }),
        pitch_down: Some(KeyboardInput {
          key: KeyboardKey::KeyK,
          min_value: 0.0,
          max_value: 1.0,
        }),
        yaw_left: Some(KeyboardInput {
          key: KeyboardKey::KeyJ,
          min_value: 0.0,
          max_value: 1.0,
        }),
        yaw_right: Some(KeyboardInput {
          key: KeyboardKey::KeyL,
          min_value: 0.0,
          max_value: 1.0,
        }),
        roll_left: Some(KeyboardInput {
          key: KeyboardKey::KeyQ,
          min_value: 0.0,
          max_value: 1.0,
        }),
        roll_right: Some(KeyboardInput {
          key: KeyboardKey::KeyE,
          min_value: 0.0,
          max_value: 1.0,
        }),
        action1_positive: Some(KeyboardInput {
          key: KeyboardKey::Digit1,
          min_value: 0.0,
          max_value: 1.0,
        }),
        action1_negative: Some(KeyboardInput {
          key: KeyboardKey::Digit2,
          min_value: 0.0,
          max_value: 1.0,
        }),
        action2_positive: Some(KeyboardInput {
          key: KeyboardKey::Digit3,
          min_value: 0.0,
          max_value: 1.0,
        }),
        action2_negative: Some(KeyboardInput {
          key: KeyboardKey::Digit4,
          min_value: 0.0,
          max_value: 1.0,
        }),
        auto_stabilization: Some(KeyboardInput {
          key: KeyboardKey::KeyU,
          min_value: 0.0,
          max_value: 1.0,
        }),
        depth_hold: Some(KeyboardInput {
          key: KeyboardKey::KeyO,
          min_value: 0.0,
          max_value: 1.0,
        }),
        record: Some(KeyboardInput {
          key: KeyboardKey::KeyR,
          min_value: 0.0,
          max_value: 1.0,
        }),
      },
      selected_gamepad_id: None,
      gamepad: HashMap::new(),
    }
  }
}
