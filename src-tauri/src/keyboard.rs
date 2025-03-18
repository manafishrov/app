use crate::models::config::Config;
use once_cell::sync::Lazy;
use sdl2::keyboard::Scancode;
use std::collections::HashMap;

// Convert JavaScript key.code string to SDL2 Scancode
pub fn keyboard_string_to_sdl2(key_str: &str) -> Option<Scancode> {
  static KEY_MAP: Lazy<HashMap<&'static str, Scancode>> = Lazy::new(|| {
    let mut map = HashMap::new();
    // Letters
    map.insert("KeyA", Scancode::A);
    map.insert("KeyB", Scancode::B);
    map.insert("KeyC", Scancode::C);
    map.insert("KeyD", Scancode::D);
    map.insert("KeyE", Scancode::E);
    map.insert("KeyF", Scancode::F);
    map.insert("KeyG", Scancode::G);
    map.insert("KeyH", Scancode::H);
    map.insert("KeyI", Scancode::I);
    map.insert("KeyJ", Scancode::J);
    map.insert("KeyK", Scancode::K);
    map.insert("KeyL", Scancode::L);
    map.insert("KeyM", Scancode::M);
    map.insert("KeyN", Scancode::N);
    map.insert("KeyO", Scancode::O);
    map.insert("KeyP", Scancode::P);
    map.insert("KeyQ", Scancode::Q);
    map.insert("KeyR", Scancode::R);
    map.insert("KeyS", Scancode::S);
    map.insert("KeyT", Scancode::T);
    map.insert("KeyU", Scancode::U);
    map.insert("KeyV", Scancode::V);
    map.insert("KeyW", Scancode::W);
    map.insert("KeyX", Scancode::X);
    map.insert("KeyY", Scancode::Y);
    map.insert("KeyZ", Scancode::Z);

    // Numbers (top row)
    map.insert("Digit1", Scancode::Num1);
    map.insert("Digit2", Scancode::Num2);
    map.insert("Digit3", Scancode::Num3);
    map.insert("Digit4", Scancode::Num4);
    map.insert("Digit5", Scancode::Num5);
    map.insert("Digit6", Scancode::Num6);
    map.insert("Digit7", Scancode::Num7);
    map.insert("Digit8", Scancode::Num8);
    map.insert("Digit9", Scancode::Num9);
    map.insert("Digit0", Scancode::Num0);

    // Function keys
    map.insert("F1", Scancode::F1);
    map.insert("F2", Scancode::F2);
    map.insert("F3", Scancode::F3);
    map.insert("F4", Scancode::F4);
    map.insert("F5", Scancode::F5);
    map.insert("F6", Scancode::F6);
    map.insert("F7", Scancode::F7);
    map.insert("F8", Scancode::F8);
    map.insert("F9", Scancode::F9);
    map.insert("F10", Scancode::F10);
    map.insert("F11", Scancode::F11);
    map.insert("F12", Scancode::F12);

    // Special keys
    map.insert("Enter", Scancode::Return);
    map.insert("Escape", Scancode::Escape);
    map.insert("Backspace", Scancode::Backspace);
    map.insert("Tab", Scancode::Tab);
    map.insert("Space", Scancode::Space);
    map.insert("Minus", Scancode::Minus);
    map.insert("Equal", Scancode::Equals);
    map.insert("BracketLeft", Scancode::LeftBracket);
    map.insert("BracketRight", Scancode::RightBracket);
    map.insert("Backslash", Scancode::Backslash);
    map.insert("Semicolon", Scancode::Semicolon);
    map.insert("Quote", Scancode::Apostrophe);
    map.insert("Backquote", Scancode::Grave);
    map.insert("Comma", Scancode::Comma);
    map.insert("Period", Scancode::Period);
    map.insert("Slash", Scancode::Slash);
    map.insert("CapsLock", Scancode::CapsLock);

    // Arrow keys
    map.insert("ArrowRight", Scancode::Right);
    map.insert("ArrowLeft", Scancode::Left);
    map.insert("ArrowDown", Scancode::Down);
    map.insert("ArrowUp", Scancode::Up);

    // Modifiers
    map.insert("ControlLeft", Scancode::LCtrl);
    map.insert("ShiftLeft", Scancode::LShift);
    map.insert("AltLeft", Scancode::LAlt);
    map.insert("MetaLeft", Scancode::LGui);
    map.insert("ControlRight", Scancode::RCtrl);
    map.insert("ShiftRight", Scancode::RShift);
    map.insert("AltRight", Scancode::RAlt);
    map.insert("MetaRight", Scancode::RGui);

    // Navigation
    map.insert("PrintScreen", Scancode::PrintScreen);
    map.insert("ScrollLock", Scancode::ScrollLock);
    map.insert("Pause", Scancode::Pause);
    map.insert("Insert", Scancode::Insert);
    map.insert("Home", Scancode::Home);
    map.insert("PageUp", Scancode::PageUp);
    map.insert("Delete", Scancode::Delete);
    map.insert("End", Scancode::End);
    map.insert("PageDown", Scancode::PageDown);

    // Numpad
    map.insert("NumLock", Scancode::NumLockClear);
    map.insert("NumpadDivide", Scancode::KpDivide);
    map.insert("NumpadMultiply", Scancode::KpMultiply);
    map.insert("NumpadSubtract", Scancode::KpMinus);
    map.insert("NumpadAdd", Scancode::KpPlus);
    map.insert("NumpadEnter", Scancode::KpEnter);
    map.insert("Numpad1", Scancode::Kp1);
    map.insert("Numpad2", Scancode::Kp2);
    map.insert("Numpad3", Scancode::Kp3);
    map.insert("Numpad4", Scancode::Kp4);
    map.insert("Numpad5", Scancode::Kp5);
    map.insert("Numpad6", Scancode::Kp6);
    map.insert("Numpad7", Scancode::Kp7);
    map.insert("Numpad8", Scancode::Kp8);
    map.insert("Numpad9", Scancode::Kp9);
    map.insert("Numpad0", Scancode::Kp0);
    map.insert("NumpadDecimal", Scancode::KpPeriod);

    map
  });

  KEY_MAP.get(key_str).cloned()
}

#[derive(Default)]
struct KeyStates {
  move_forward: bool,
  move_backward: bool,
  move_left: bool,
  move_right: bool,
  move_up: bool,
  move_down: bool,
  pitch_up: bool,
  pitch_down: bool,
  yaw_left: bool,
  yaw_right: bool,
  roll_left: bool,
  roll_right: bool,
}

fn process_key_pair(positive: bool, negative: bool) -> f32 {
  match (positive, negative) {
    (true, false) => 1.0,
    (false, true) => -1.0,
    _ => 0.0,
  }
}

pub fn get_keyboard_input(
  keyboard_state: &sdl2::keyboard::KeyboardState,
  config: &Config,
) -> Result<[f32; 6], String> {
  match panic::catch_unwind(|| {
    let mut states = KeyStates::default();

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.move_forward) {
      states.move_forward = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.move_backward) {
      states.move_backward = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.move_left) {
      states.move_left = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.move_right) {
      states.move_right = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.move_up) {
      states.move_up = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.move_down) {
      states.move_down = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.pitch_up) {
      states.pitch_up = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.pitch_down) {
      states.pitch_down = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.yaw_left) {
      states.yaw_left = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.yaw_right) {
      states.yaw_right = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.roll_left) {
      states.roll_left = keyboard_state.is_scancode_pressed(scancode);
    }

    if let Some(scancode) = keyboard_string_to_sdl2(&config.keyboard.roll_right) {
      states.roll_right = keyboard_state.is_scancode_pressed(scancode);
    }

    let control_array = [
      process_key_pair(states.move_forward, states.move_backward),
      process_key_pair(states.move_right, states.move_left),
      process_key_pair(states.move_up, states.move_down),
      process_key_pair(states.pitch_up, states.pitch_down),
      process_key_pair(states.yaw_right, states.yaw_left),
      process_key_pair(states.roll_right, states.roll_left),
    ];

    Ok(control_array)
  }) {
    Ok(result) => result,
    Err(e) => {
      println!("Caught panic in keyboard handling: {:?}", e);
      Ok([0.0; 6]) // Return neutral inputs in case of panic
    }
  }
}
