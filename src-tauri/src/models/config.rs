use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::version::current_app_version;

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

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub enum CustomActionTrigger {
  #[default]
  Tap,
  Hold,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct CustomActionBinding {
  pub id: String,
  pub module: String,
  pub trigger: CustomActionTrigger,
  pub keyboard: Option<KeyboardInput>,
  pub gamepad: HashMap<String, Option<GamepadInput>>,
}

/// Every element that can be placed on the camera overlay. An element is shown
/// if and only if a layout places it, so there are no enable/disable flags.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum OverlayWidgetType {
  ConnectionStatus,
  Recording,
  WorkIndicator,
  AttitudeScientific,
  #[serde(rename = "attitudeModel3D")]
  AttitudeModel3D,
  AttitudeClassic,
  AutoStabilization,
  DepthHold,
  CurrentDepth,
  DesiredDepth,
  WaterTemperature,
  ElectronicsTemperature,
  BatteryLevel,
  CurrentDraw,
  ThrusterRpm1,
  ThrusterRpm2,
  ThrusterRpm3,
  ThrusterRpm4,
  ThrusterRpm5,
  ThrusterRpm6,
  ThrusterRpm7,
  ThrusterRpm8,
  // Legacy groups remain readable and are split by the frontend.
  Stabilization,
  ThrusterRpm,
  Depth,
  Temperature,
  Battery,
}

/// Where a widget's content sits inside the grid rectangle it occupies.
#[derive(Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum OverlayAnchor {
  TopLeft,
  Top,
  TopRight,
  Left,
  Center,
  Right,
  BottomLeft,
  Bottom,
  BottomRight,
}

/// Per-instance widget settings. Every field is optional so new options never
/// invalidate a stored layout, and so a widget type can ignore the ones that do
/// not apply to it.
#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default, deny_unknown_fields)]
pub struct OverlayWidgetOptions {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub work_indicator: Option<bool>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OverlayWidget {
  /// Stable instance id, so the same type can be placed more than once.
  pub id: String,
  #[serde(rename = "type")]
  pub widget_type: OverlayWidgetType,
  /// 1-based grid anchor cell.
  pub column: u16,
  pub row: u16,
  pub column_span: u16,
  pub row_span: u16,
  pub anchor: OverlayAnchor,
  #[serde(default)]
  pub options: OverlayWidgetOptions,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OverlayLayout {
  pub id: String,
  pub name: String,
  /// Grid resolution this layout was authored against, so the frontend can
  /// rescale placements if the constants ever change.
  pub columns: u16,
  pub rows: u16,
  pub widgets: Vec<OverlayWidget>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct OverlayConfig {
  pub active_layout_id: String,
  pub layouts: Vec<OverlayLayout>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateCheckConfig {
  pub check_for_app_updates_on_startup: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Config {
  pub app_version: String,
  /// Fully user-arranged camera overlay. Stored app-side because it is an
  /// operator/workstation preference, and because the overlay has to render
  /// before any ROV is connected.
  pub overlay: OverlayConfig,
  pub video_directory: String,
  #[serde(flatten)]
  pub update_checks: UpdateCheckConfig,
  pub ip_address: String,
  pub webrtc_signaling_api_port: u16,
  pub webrtc_signaling_api_path: String,
  pub web_socket_port: u16,
  // Whether the Camera settings form computes bitrate automatically from the
  // selected resolution/framerate, or shows a manual slider. This is purely
  // an app-side UI preference (unlike the rest of the camera settings, which
  // live in the ROV config), so it's stored here instead. `serde(default)`
  // so a config saved before this field existed still loads instead of being
  // discarded wholesale.
  #[serde(default = "default_automatic_bitrate")]
  pub automatic_bitrate: bool,
  pub keyboard: KeyboardBindings,
  #[serde(default)]
  pub custom_actions: Vec<CustomActionBinding>,
  pub selected_gamepad_id: Option<String>,
  pub gamepad: HashMap<String, GamepadBindings>,
}

fn default_automatic_bitrate() -> bool {
  true
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

pub const DEFAULT_OVERLAY_LAYOUT_ID: &str = "default";
pub const OVERLAY_GRID_COLUMNS: u16 = 32;
pub const OVERLAY_GRID_ROWS: u16 = 24;

fn overlay_widget(
  id: &str,
  widget_type: OverlayWidgetType,
  column: u16,
  row: u16,
  column_span: u16,
  row_span: u16,
  anchor: OverlayAnchor,
) -> OverlayWidget {
  OverlayWidget {
    id: id.to_string(),
    widget_type,
    column,
    row,
    column_span,
    row_span,
    anchor,
    options: OverlayWidgetOptions::default(),
  }
}

fn default_thruster_widgets() -> Vec<OverlayWidget> {
  vec![
    overlay_widget(
      "thruster-rpm-1",
      OverlayWidgetType::ThrusterRpm1,
      28,
      9,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-2",
      OverlayWidgetType::ThrusterRpm2,
      28,
      10,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-3",
      OverlayWidgetType::ThrusterRpm3,
      28,
      11,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-4",
      OverlayWidgetType::ThrusterRpm4,
      28,
      12,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-5",
      OverlayWidgetType::ThrusterRpm5,
      28,
      13,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-6",
      OverlayWidgetType::ThrusterRpm6,
      28,
      14,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-7",
      OverlayWidgetType::ThrusterRpm7,
      28,
      15,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
    overlay_widget(
      "thruster-rpm-8",
      OverlayWidgetType::ThrusterRpm8,
      28,
      16,
      5,
      1,
      OverlayAnchor::BottomRight,
    ),
  ]
}

/// Operator-approved defaults, mirrored in src/stores/overlayDefaults.ts.
pub fn default_overlay_widgets() -> Vec<OverlayWidget> {
  let mut widgets = vec![
    overlay_widget(
      "connection-status",
      OverlayWidgetType::ConnectionStatus,
      1,
      1,
      4,
      1,
      OverlayAnchor::TopRight,
    ),
    overlay_widget("recording", OverlayWidgetType::Recording, 5, 1, 4, 1, OverlayAnchor::TopRight),
    overlay_widget(
      "stabilization",
      OverlayWidgetType::AutoStabilization,
      1,
      11,
      2,
      2,
      OverlayAnchor::Left,
    ),
    overlay_widget("depth-hold", OverlayWidgetType::DepthHold, 1, 13, 2, 2, OverlayAnchor::Left),
    overlay_widget(
      "attitude",
      OverlayWidgetType::AttitudeScientific,
      1,
      18,
      7,
      7,
      OverlayAnchor::BottomLeft,
    ),
    overlay_widget("depth", OverlayWidgetType::CurrentDepth, 18, 24, 5, 1, OverlayAnchor::TopLeft),
    overlay_widget(
      "target-depth",
      OverlayWidgetType::DesiredDepth,
      18,
      23,
      5,
      1,
      OverlayAnchor::TopLeft,
    ),
    overlay_widget(
      "water-temperature",
      OverlayWidgetType::WaterTemperature,
      23,
      23,
      5,
      1,
      OverlayAnchor::Right,
    ),
    overlay_widget(
      "electronics-temperature",
      OverlayWidgetType::ElectronicsTemperature,
      23,
      24,
      5,
      1,
      OverlayAnchor::Right,
    ),
    overlay_widget(
      "current-draw",
      OverlayWidgetType::CurrentDraw,
      28,
      23,
      5,
      1,
      OverlayAnchor::Right,
    ),
    overlay_widget("battery", OverlayWidgetType::BatteryLevel, 28, 24, 5, 1, OverlayAnchor::Right),
    overlay_widget("work", OverlayWidgetType::WorkIndicator, 1, 17, 4, 1, OverlayAnchor::Right),
  ];
  widgets.splice(5..5, default_thruster_widgets());
  widgets
}

pub fn default_overlay_config() -> OverlayConfig {
  OverlayConfig {
    active_layout_id: DEFAULT_OVERLAY_LAYOUT_ID.to_string(),
    layouts: vec![OverlayLayout {
      id: DEFAULT_OVERLAY_LAYOUT_ID.to_string(),
      // Localised in the frontend; a stored layout keeps whatever the user
      // renamed it to.
      name: "Default".to_string(),
      columns: OVERLAY_GRID_COLUMNS,
      rows: OVERLAY_GRID_ROWS,
      widgets: default_overlay_widgets(),
    }],
  }
}

impl Default for Config {
  fn default() -> Self {
    Config {
      app_version: current_app_version(),
      overlay: default_overlay_config(),
      video_directory: default_video_directory(),
      update_checks: UpdateCheckConfig {
        check_for_app_updates_on_startup: true,
      },
      ip_address: "10.10.10.10".to_string(),
      webrtc_signaling_api_port: 1984,
      webrtc_signaling_api_path: "/api/webrtc?src=cam".to_string(),
      web_socket_port: 9000,
      automatic_bitrate: true,
      keyboard: KeyboardBindings::default(),
      custom_actions: Vec::new(),
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

  /// Mirrored by `default overlay layout` in
  /// `src/features/overlay/widgets/registry.test.ts`. If this list changes,
  /// change the `TypeScript` one in the same commit.
  ///
  /// # Panics
  /// Panics if the default layout drifts from the frontend's copy.
  fn assert_default_overlay_layout(config: &Config) {
    let Some(layout) = config.overlay.layouts.first() else {
      panic!("default config has a layout");
    };

    assert_eq!(layout.columns, OVERLAY_GRID_COLUMNS);
    assert_eq!(layout.rows, OVERLAY_GRID_ROWS);

    let placement: Vec<(&str, &str)> = layout
      .widgets
      .iter()
      .map(|widget| {
        let type_name = match widget.widget_type {
          OverlayWidgetType::ConnectionStatus => "connectionStatus",
          OverlayWidgetType::Recording => "recording",
          OverlayWidgetType::WorkIndicator => "workIndicator",
          OverlayWidgetType::AttitudeScientific => "attitudeScientific",
          OverlayWidgetType::AttitudeModel3D => "attitudeModel3D",
          OverlayWidgetType::AttitudeClassic => "attitudeClassic",
          OverlayWidgetType::AutoStabilization => "autoStabilization",
          OverlayWidgetType::DepthHold => "depthHold",
          OverlayWidgetType::CurrentDepth => "currentDepth",
          OverlayWidgetType::DesiredDepth => "desiredDepth",
          OverlayWidgetType::WaterTemperature => "waterTemperature",
          OverlayWidgetType::ElectronicsTemperature => "electronicsTemperature",
          OverlayWidgetType::BatteryLevel => "batteryLevel",
          OverlayWidgetType::CurrentDraw => "currentDraw",
          OverlayWidgetType::Stabilization => "stabilization",
          OverlayWidgetType::ThrusterRpm1 => "thrusterRpm1",
          OverlayWidgetType::ThrusterRpm2 => "thrusterRpm2",
          OverlayWidgetType::ThrusterRpm3 => "thrusterRpm3",
          OverlayWidgetType::ThrusterRpm4 => "thrusterRpm4",
          OverlayWidgetType::ThrusterRpm5 => "thrusterRpm5",
          OverlayWidgetType::ThrusterRpm6 => "thrusterRpm6",
          OverlayWidgetType::ThrusterRpm7 => "thrusterRpm7",
          OverlayWidgetType::ThrusterRpm8 => "thrusterRpm8",
          OverlayWidgetType::ThrusterRpm => "thrusterRpm",
          OverlayWidgetType::Depth => "depth",
          OverlayWidgetType::Temperature => "temperature",
          OverlayWidgetType::Battery => "battery",
        };
        (widget.id.as_str(), type_name)
      })
      .collect();

    assert_eq!(
      placement,
      vec![
        ("connection-status", "connectionStatus"),
        ("recording", "recording"),
        ("stabilization", "autoStabilization"),
        ("depth-hold", "depthHold"),
        ("attitude", "attitudeScientific"),
        ("thruster-rpm-1", "thrusterRpm1"),
        ("thruster-rpm-2", "thrusterRpm2"),
        ("thruster-rpm-3", "thrusterRpm3"),
        ("thruster-rpm-4", "thrusterRpm4"),
        ("thruster-rpm-5", "thrusterRpm5"),
        ("thruster-rpm-6", "thrusterRpm6"),
        ("thruster-rpm-7", "thrusterRpm7"),
        ("thruster-rpm-8", "thrusterRpm8"),
        ("depth", "currentDepth"),
        ("target-depth", "desiredDepth"),
        ("water-temperature", "waterTemperature"),
        ("electronics-temperature", "electronicsTemperature"),
        ("current-draw", "currentDraw"),
        ("battery", "batteryLevel"),
        ("work", "workIndicator"),
      ]
    );

    // Every widget stays inside the grid.
    for widget in &layout.widgets {
      assert!(widget.column >= 1 && widget.row >= 1);
      assert!(widget.column + widget.column_span - 1 <= layout.columns);
      assert!(widget.row + widget.row_span - 1 <= layout.rows);
    }
  }

  /// # Panics
  /// Panics if any default config value differs from the expected defaults.
  #[test]
  fn config_default_has_expected_values() {
    let config = Config::default();

    assert_eq!(config.app_version, current_app_version());
    assert_eq!(config.overlay.active_layout_id, DEFAULT_OVERLAY_LAYOUT_ID);
    assert_eq!(config.overlay.layouts.len(), 1);
    assert_default_overlay_layout(&config);
    assert!(config.update_checks.check_for_app_updates_on_startup);
    assert_eq!(config.ip_address, "10.10.10.10");
    assert_eq!(config.webrtc_signaling_api_port, 1984);
    assert_eq!(config.webrtc_signaling_api_path, "/api/webrtc?src=cam");
    assert_eq!(config.web_socket_port, 9000);
    assert!(config.automatic_bitrate);
    assert!(config.custom_actions.is_empty());
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
    assert!(serialized.get("overlay").is_some());
    assert!(serialized.get("videoDirectory").is_some());
    assert!(serialized.get("app_version").is_none());
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

  /// # Panics
  /// Panics if a config saved before `automaticBitrate` existed fails to
  /// deserialize, or doesn't fall back to `true`.
  #[test]
  fn config_deserialization_defaults_automatic_bitrate_when_missing() {
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
    let _ = object.remove("automaticBitrate");

    let deserialized = serde_json::from_value::<Config>(serialized);
    assert!(deserialized.is_ok());
    let Ok(deserialized) = deserialized else {
      return;
    };

    assert!(deserialized.automatic_bitrate);
  }
}
