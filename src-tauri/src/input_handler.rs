use crate::commands::config::get_config;
use crate::models::config::{Config, ControlSource};
use device_query::{DeviceQuery, DeviceState, Keycode};
use gilrs::{Axis, Button, Gilrs};
use once_cell::sync::Lazy;
use std::str::FromStr;
use std::sync::Mutex;
use std::time::Duration;
use tauri::WebviewWindow;
use tokio::sync::mpsc::Sender;
use tokio::time;

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

fn get_keyboard_input(device_state: &DeviceState) -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let keys: Vec<Keycode> = device_state.get_keys();
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

fn get_gamepad_input(gilrs: &mut Gilrs) -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let mut control_array = [0.0; 6];

  while let Some(_) = gilrs.next_event() {}

  if let Some((_id, gamepad)) = gilrs.gamepads().next() {
    match config.controller.movement {
      ControlSource::LeftStick => {
        control_array[0] = gamepad.value(Axis::LeftStickY);
        control_array[1] = gamepad.value(Axis::LeftStickX);
      }
      ControlSource::RightStick => {
        control_array[0] = gamepad.value(Axis::RightStickY);
        control_array[1] = gamepad.value(Axis::RightStickX);
      }
      ControlSource::DPad => {
        control_array[0] = if gamepad.is_pressed(Button::DPadUp) {
          1.0
        } else if gamepad.is_pressed(Button::DPadDown) {
          -1.0
        } else {
          0.0
        };
        control_array[1] = if gamepad.is_pressed(Button::DPadRight) {
          1.0
        } else if gamepad.is_pressed(Button::DPadLeft) {
          -1.0
        } else {
          0.0
        };
      }
    }

    match config.controller.tilt {
      ControlSource::LeftStick => {
        control_array[4] = -gamepad.value(Axis::LeftStickY);
        control_array[5] = gamepad.value(Axis::LeftStickX);
      }
      ControlSource::RightStick => {
        control_array[4] = -gamepad.value(Axis::RightStickY);
        control_array[5] = gamepad.value(Axis::RightStickX);
      }
      ControlSource::DPad => {
        control_array[4] = if gamepad.is_pressed(Button::DPadUp) {
          1.0
        } else if gamepad.is_pressed(Button::DPadDown) {
          -1.0
        } else {
          0.0
        };
        control_array[5] = if gamepad.is_pressed(Button::DPadRight) {
          1.0
        } else if gamepad.is_pressed(Button::DPadLeft) {
          -1.0
        } else {
          0.0
        };
      }
    }

    control_array[2] = if gamepad.is_pressed(Button::South) {
      // Example using standard button mappings
      1.0
    } else if gamepad.is_pressed(Button::North) {
      -1.0
    } else {
      0.0
    };

    control_array[3] = if gamepad.is_pressed(Button::RightTrigger) {
      1.0
    } else if gamepad.is_pressed(Button::LeftTrigger) {
      -1.0
    } else {
      0.0
    };
  }

  control_array
    .iter_mut()
    .for_each(|v| *v = v.clamp(-1.0, 1.0));

  Ok(control_array)
}

pub fn merge_inputs(keyboard: [f32; 6], gamepad: [f32; 6]) -> [f32; 6] {
  let mut result = [0.0; 6];
  for i in 0..6 {
    result[i] = (keyboard[i] + gamepad[i]).clamp(-1.0, 1.0);
  }
  result
}

pub async fn start_input_handler(window: WebviewWindow, input_tx: Sender<[f32; 6]>) {
  let mut interval = time::interval(Duration::from_millis(16));
  let mut gilrs = Gilrs::new().unwrap_or_else(|_| {
    println!("Failed to initialize gamepad support");
    Gilrs::new().expect("Failed to create dummy gamepad instance")
  });
  let device_state = DeviceState::new();

  loop {
    interval.tick().await;

    if !window.is_focused().unwrap_or(false) {
      let zero_input = [0.0; 6];
      let _ = input_tx.send(zero_input).await;
      continue;
    }

    let keyboard_input = get_keyboard_input(&device_state).unwrap_or([0.0; 6]);
    let gamepad_input = get_gamepad_input(&mut gilrs).unwrap_or([0.0; 6]);

    let final_input = merge_inputs(keyboard_input, gamepad_input);
    println!("Input: {:?}", final_input);

    let _ = input_tx.send(final_input).await;
  }
}

pub fn update_config(new_config: Config) {
  if let Ok(mut config) = CURRENT_CONFIG.lock() {
    *config = new_config;
  }
}
