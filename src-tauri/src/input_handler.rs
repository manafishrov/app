use crate::commands::config::get_config;
use crate::models::config::Config;
use device_query::{DeviceQuery, DeviceState, Keycode};
use once_cell::sync::Lazy;
use std::str::FromStr;
use std::sync::Mutex;

static DEVICE_STATE: Lazy<DeviceState> = Lazy::new(|| DeviceState::new());
static CURRENT_CONFIG: Lazy<Mutex<Config>> =
  Lazy::new(|| Mutex::new(get_config().unwrap_or_default()));

#[derive(Default)]
struct KeyStates {
  move_forward: bool,
  move_backward: bool,
  move_left: bool,
  move_right: bool,
  move_up: bool,
  move_down: bool,
  rotate_left: bool,
  rotate_right: bool,
  tilt_up: bool,
  tilt_down: bool,
  tilt_left: bool,
  tilt_right: bool,
}

fn process_key_pair(positive: bool, negative: bool) -> f32 {
  match (positive, negative) {
    (true, false) => 1.0,
    (false, true) => -1.0,
    _ => 0.0,
  }
}

pub fn get_keyboard_input() -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let keys: Vec<Keycode> = DEVICE_STATE.get_keys();
  let mut states = KeyStates::default();

  for key in keys {
    if key == Keycode::from_str(&config.keyboard.move_forward).unwrap_or(Keycode::W) {
      states.move_forward = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_backward).unwrap_or(Keycode::S) {
      states.move_backward = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_left).unwrap_or(Keycode::A) {
      states.move_left = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_right).unwrap_or(Keycode::D) {
      states.move_right = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_up).unwrap_or(Keycode::Space) {
      states.move_up = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_down).unwrap_or(Keycode::LShift) {
      states.move_down = true;
    }
    if key == Keycode::from_str(&config.keyboard.rotate_left).unwrap_or(Keycode::Q) {
      states.rotate_left = true;
    }
    if key == Keycode::from_str(&config.keyboard.rotate_right).unwrap_or(Keycode::E) {
      states.rotate_right = true;
    }
    if key == Keycode::from_str(&config.keyboard.tilt_up).unwrap_or(Keycode::I) {
      states.tilt_up = true;
    }
    if key == Keycode::from_str(&config.keyboard.tilt_down).unwrap_or(Keycode::K) {
      states.tilt_down = true;
    }
    if key == Keycode::from_str(&config.keyboard.tilt_diagonal_left).unwrap_or(Keycode::J) {
      states.tilt_left = true;
    }
    if key == Keycode::from_str(&config.keyboard.tilt_diagonal_right).unwrap_or(Keycode::L) {
      states.tilt_right = true;
    }
  }

  let control_array = [
    process_key_pair(states.move_forward, states.move_backward),
    process_key_pair(states.move_right, states.move_left),
    process_key_pair(states.move_up, states.move_down),
    process_key_pair(states.rotate_right, states.rotate_left),
    process_key_pair(states.tilt_up, states.tilt_down),
    process_key_pair(states.tilt_right, states.tilt_left),
  ];

  Ok(control_array)
}

pub fn get_gamepad_input() -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let gamepads = DEVICE_STATE.get_gamepad();

  if gamepads.is_empty() {
    return Ok([0.0; 6]);
  }

  let gamepad = &gamepads[0];
  let mut control_array = [0.0; 6];

  match config.controller.movement {
    ControlSource::LeftStick => {
      control_array[0] = gamepad.axes[1] as f32;
      control_array[1] = gamepad.axes[0] as f32;
    }
    ControlSource::RightStick => {
      control_array[0] = gamepad.axes[3] as f32;
      control_array[1] = gamepad.axes[2] as f32;
    }
    ControlSource::DPad => {
      control_array[0] = if gamepad.dpad_up {
        1.0
      } else if gamepad.dpad_down {
        -1.0
      } else {
        0.0
      };
      control_array[1] = if gamepad.dpad_right {
        1.0
      } else if gamepad.dpad_left {
        -1.0
      } else {
        0.0
      };
    }
  }

  match config.controller.tilt {
    ControlSource::LeftStick => {
      control_array[4] = -gamepad.axes[1] as f32;
      control_array[5] = gamepad.axes[0] as f32;
    }
    ControlSource::RightStick => {
      control_array[4] = -gamepad.axes[3] as f32;
      control_array[5] = gamepad.axes[2] as f32;
    }
    ControlSource::DPad => {
      control_array[4] = if gamepad.dpad_up {
        1.0
      } else if gamepad.dpad_down {
        -1.0
      } else {
        0.0
      };
      control_array[5] = if gamepad.dpad_right {
        1.0
      } else if gamepad.dpad_left {
        -1.0
      } else {
        0.0
      };
    }
  }

  control_array[2] = if gamepad.buttons[config.controller.move_up as usize] {
    1.0
  } else if gamepad.buttons[config.controller.move_down as usize] {
    -1.0
  } else {
    0.0
  };

  control_array[3] = if gamepad.buttons[config.controller.rotate_right as usize] {
    1.0
  } else if gamepad.buttons[config.controller.rotate_left as usize] {
    -1.0
  } else {
    0.0
  };

  control_array
    .iter_mut()
    .for_each(|v| *v = v.clamp(-1.0, 1.0));

  Ok(control_array)
}

pub fn merge_inputs(first: [f32; 6], second: [f32; 6]) -> [f32; 6] {
  let mut result = [0.0; 6];
  for i in 0..6 {
    result[i] = (first[i] + second[i]).clamp(-1.0, 1.0);
  }
  result
}

pub fn update_config(new_config: Config) {
  if let Ok(mut config) = CURRENT_CONFIG.lock() {
    *config = new_config;
  }
}
