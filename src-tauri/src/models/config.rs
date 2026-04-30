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
#[serde(rename_all = "camelCase", default)]
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
  pub desired_depth_entry: Option<KeyboardInput>,
  pub desired_depth_increase: Option<KeyboardInput>,
  pub desired_depth_decrease: Option<KeyboardInput>,
  pub record: Option<KeyboardInput>,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
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
  pub desired_depth_entry: Option<GamepadInput>,
  pub desired_depth_increase: Option<GamepadInput>,
  pub desired_depth_decrease: Option<GamepadInput>,
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
  pub check_for_app_updates_on_startup: bool,
  pub check_for_firmware_updates_on_connect: bool,
  pub ip_address: String,
  pub webrtc_signaling_api_port: u16,
  pub webrtc_signaling_api_path: String,
  pub web_socket_port: u16,
  pub keyboard: KeyboardBindings,
  pub selected_gamepad_id: Option<String>,
  pub gamepad: HashMap<String, GamepadBindings>,
}

fn default_video_directory() -> String {
  if cfg!(target_os = "windows") {
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
  }
}

fn default_keyboard_input(key: KeyboardKey) -> KeyboardInput {
  KeyboardInput {
    key,
    min_value: 0.0,
    max_value: 1.0,
  }
}

impl Default for KeyboardBindings {
  fn default() -> Self {
    Self {
      surge_forward: Some(default_keyboard_input(KeyboardKey::KeyW)),
      surge_backward: Some(default_keyboard_input(KeyboardKey::KeyS)),
      sway_right: Some(default_keyboard_input(KeyboardKey::KeyD)),
      sway_left: Some(default_keyboard_input(KeyboardKey::KeyA)),
      heave_up: Some(default_keyboard_input(KeyboardKey::Space)),
      heave_down: Some(default_keyboard_input(KeyboardKey::ShiftLeft)),
      pitch_up: Some(default_keyboard_input(KeyboardKey::KeyI)),
      pitch_down: Some(default_keyboard_input(KeyboardKey::KeyK)),
      yaw_right: Some(default_keyboard_input(KeyboardKey::KeyL)),
      yaw_left: Some(default_keyboard_input(KeyboardKey::KeyJ)),
      roll_left: Some(default_keyboard_input(KeyboardKey::KeyQ)),
      roll_right: Some(default_keyboard_input(KeyboardKey::KeyE)),
      action1_positive: Some(default_keyboard_input(KeyboardKey::Digit1)),
      action1_negative: Some(default_keyboard_input(KeyboardKey::Digit2)),
      action2_positive: Some(default_keyboard_input(KeyboardKey::Digit3)),
      action2_negative: Some(default_keyboard_input(KeyboardKey::Digit4)),
      auto_stabilization: Some(default_keyboard_input(KeyboardKey::KeyU)),
      depth_hold: Some(default_keyboard_input(KeyboardKey::KeyO)),
      desired_depth_entry: Some(default_keyboard_input(KeyboardKey::KeyP)),
      desired_depth_increase: Some(default_keyboard_input(KeyboardKey::ArrowUp)),
      desired_depth_decrease: Some(default_keyboard_input(KeyboardKey::ArrowDown)),
      record: Some(default_keyboard_input(KeyboardKey::KeyR)),
    }
  }
}

impl Default for Config {
  fn default() -> Self {
    Config {
      app_version: env!("CARGO_PKG_VERSION").to_string(),
      overlay_scale: 2,
      attitude_indicator: AttitudeIndicator::Scientific,
      work_indicator: false,
      thruster_rpm_overlay: false,
      video_directory: default_video_directory(),
      check_for_app_updates_on_startup: true,
      check_for_firmware_updates_on_connect: true,
      ip_address: "10.10.10.10".to_string(),
      webrtc_signaling_api_port: 1984,
      webrtc_signaling_api_path: "/api/webrtc?src=cam".to_string(),
      web_socket_port: 9000,
      keyboard: KeyboardBindings::default(),
      selected_gamepad_id: None,
      gamepad: HashMap::new(),
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if the two floating-point values are not equal within epsilon.
  fn assert_f32_eq(actual: f32, expected: f32) {
    assert!((actual - expected).abs() <= f32::EPSILON);
  }

  /// # Panics
  /// Panics if the binding is missing, has an unexpected key, or has
  /// unexpected range values.
  fn assert_keyboard_binding(
    binding: Option<&KeyboardInput>,
    matches_key: impl Fn(&KeyboardKey) -> bool,
  ) {
    assert!(binding.is_some());

    let Some(input) = binding else {
      return;
    };

    assert!(matches_key(&input.key));
    assert_f32_eq(input.min_value, 0.0);
    assert_f32_eq(input.max_value, 1.0);
  }

  /// # Panics
  /// Panics if any default config value differs from the expected defaults.
  #[test]
  fn config_default_has_expected_values() {
    let config = Config::default();

    assert_eq!(config.app_version, env!("CARGO_PKG_VERSION"));
    assert_eq!(config.overlay_scale, 2);
    assert!(matches!(config.attitude_indicator, AttitudeIndicator::Scientific));
    assert!(!config.work_indicator);
    assert!(!config.thruster_rpm_overlay);
    assert_eq!(config.ip_address, "10.10.10.10");
    assert_eq!(config.webrtc_signaling_api_port, 1984);
    assert_eq!(config.webrtc_signaling_api_path, "/api/webrtc?src=cam");
    assert_eq!(config.web_socket_port, 9000);
    assert!(config.selected_gamepad_id.is_none());
    assert!(config.gamepad.is_empty());

    if cfg!(target_os = "windows") {
      assert!(config.video_directory.contains("Videos"));
      assert!(config.video_directory.contains("Manafish"));
    } else if cfg!(target_os = "macos") {
      assert!(config.video_directory.contains("/Movies/Manafish"));
    } else {
      assert!(config.video_directory.contains("/Videos/Manafish"));
    }

    assert_keyboard_binding(config.keyboard.surge_forward.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyW)
    });
    assert_keyboard_binding(config.keyboard.surge_backward.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyS)
    });
    assert_keyboard_binding(config.keyboard.sway_right.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyD)
    });
    assert_keyboard_binding(config.keyboard.sway_left.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyA)
    });
    assert_keyboard_binding(config.keyboard.heave_up.as_ref(), |key| {
      matches!(key, KeyboardKey::Space)
    });
    assert_keyboard_binding(config.keyboard.heave_down.as_ref(), |key| {
      matches!(key, KeyboardKey::ShiftLeft)
    });
    assert_keyboard_binding(config.keyboard.pitch_up.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyI)
    });
    assert_keyboard_binding(config.keyboard.pitch_down.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyK)
    });
    assert_keyboard_binding(config.keyboard.yaw_right.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyL)
    });
    assert_keyboard_binding(config.keyboard.yaw_left.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyJ)
    });
    assert_keyboard_binding(config.keyboard.roll_left.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyQ)
    });
    assert_keyboard_binding(config.keyboard.roll_right.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyE)
    });
    assert_keyboard_binding(config.keyboard.action1_positive.as_ref(), |key| {
      matches!(key, KeyboardKey::Digit1)
    });
    assert_keyboard_binding(config.keyboard.action1_negative.as_ref(), |key| {
      matches!(key, KeyboardKey::Digit2)
    });
    assert_keyboard_binding(config.keyboard.action2_positive.as_ref(), |key| {
      matches!(key, KeyboardKey::Digit3)
    });
    assert_keyboard_binding(config.keyboard.action2_negative.as_ref(), |key| {
      matches!(key, KeyboardKey::Digit4)
    });
    assert_keyboard_binding(config.keyboard.auto_stabilization.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyU)
    });
    assert_keyboard_binding(config.keyboard.depth_hold.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyO)
    });
    assert_keyboard_binding(config.keyboard.desired_depth_entry.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyP)
    });
    assert_keyboard_binding(config.keyboard.desired_depth_increase.as_ref(), |key| {
      matches!(key, KeyboardKey::ArrowUp)
    });
    assert_keyboard_binding(config.keyboard.desired_depth_decrease.as_ref(), |key| {
      matches!(key, KeyboardKey::ArrowDown)
    });
    assert_keyboard_binding(config.keyboard.record.as_ref(), |key| {
      matches!(key, KeyboardKey::KeyR)
    });
  }

  /// # Panics
  /// Panics if any default gamepad binding is set.
  #[test]
  fn gamepad_bindings_default_has_all_fields_unset() {
    let bindings = GamepadBindings::default();

    assert!(bindings.surge_forward.is_none());
    assert!(bindings.surge_backward.is_none());
    assert!(bindings.sway_right.is_none());
    assert!(bindings.sway_left.is_none());
    assert!(bindings.heave_up.is_none());
    assert!(bindings.heave_down.is_none());
    assert!(bindings.pitch_up.is_none());
    assert!(bindings.pitch_down.is_none());
    assert!(bindings.yaw_right.is_none());
    assert!(bindings.yaw_left.is_none());
    assert!(bindings.roll_left.is_none());
    assert!(bindings.roll_right.is_none());
    assert!(bindings.action1_positive.is_none());
    assert!(bindings.action1_negative.is_none());
    assert!(bindings.action2_positive.is_none());
    assert!(bindings.action2_negative.is_none());
    assert!(bindings.auto_stabilization.is_none());
    assert!(bindings.depth_hold.is_none());
    assert!(bindings.desired_depth_entry.is_none());
    assert!(bindings.desired_depth_increase.is_none());
    assert!(bindings.desired_depth_decrease.is_none());
    assert!(bindings.record.is_none());
  }

  /// # Panics
  /// Panics if serialization or deserialization fails, or if JSON field names
  /// do not match the expected serde output.
  #[test]
  fn config_serialization_round_trip_preserves_fields() {
    let config = Config::default();

    let serialized = serde_json::to_value(&config);
    assert!(serialized.is_ok(), "Config serialization failed: {serialized:?}");
    let Ok(serialized) = serialized else {
      return;
    };

    assert!(serialized.get("appVersion").is_some());
    assert!(serialized.get("overlayScale").is_some());
    assert!(serialized.get("videoDirectory").is_some());
    assert!(serialized.get("app_version").is_none());
    assert!(serialized.get("overlay_scale").is_none());
    assert!(serialized.get("video_directory").is_none());

    let deserialized = serde_json::from_value::<Config>(serialized.clone());
    assert!(deserialized.is_ok());
    let Ok(deserialized) = deserialized else {
      return;
    };

    let reserialized = serde_json::to_value(&deserialized);
    assert!(reserialized.is_ok(), "Config reserialization failed: {reserialized:?}");
    let Ok(reserialized) = reserialized else {
      return;
    };

    assert_eq!(serialized, reserialized);
  }

  /// # Panics
  /// Panics if unknown config fields are accepted during deserialization.
  #[test]
  fn config_deserialization_rejects_unknown_fields() {
    let serialized = serde_json::to_value(Config::default());
    assert!(serialized.is_ok(), "Config serialization failed: {serialized:?}");
    let Ok(mut serialized) = serialized else {
      return;
    };

    let object = serialized.as_object_mut();
    assert!(object.is_some());
    let Some(object) = object else {
      return;
    };
    let _ = object.insert("unexpectedField".to_string(), serde_json::json!(true));

    let deserialized = serde_json::from_value::<Config>(serialized);
    assert!(deserialized.is_err());
  }
}
