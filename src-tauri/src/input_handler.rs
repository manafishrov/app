use crate::commands::config::get_config;
use crate::gamepad::{button_from_u16, gamepad_to_json};
use crate::models::config::{Config, ControlSource};
use device_query::{DeviceQuery, DeviceState, Keycode};
use gilrs::{Axis, Button, Gilrs};
use once_cell::sync::Lazy;
use std::str::FromStr;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime, WebviewWindow};
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

fn get_keyboard_input(device_state: &DeviceState) -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let keys: Vec<Keycode> = device_state.get_keys();
  let mut states = KeyStates::default();

  fn check_modifier(key: &Keycode, config_key: &str) -> bool {
    match config_key {
      "Control" => matches!(key, Keycode::LControl | Keycode::RControl),
      "Shift" => matches!(key, Keycode::LShift | Keycode::RShift),
      "Alt" => matches!(
        key,
        Keycode::LAlt | Keycode::RAlt | Keycode::LOption | Keycode::ROption
      ),
      "Meta" => matches!(key, Keycode::LMeta | Keycode::RMeta | Keycode::Command),
      _ => false,
    }
  }

  for key in &keys {
    if let Ok(config_key) = Keycode::from_str(&config.keyboard.move_forward) {
      if *key == config_key {
        states.move_forward = true;
      }
    } else if check_modifier(key, &config.keyboard.move_forward) {
      states.move_forward = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.move_backward) {
      if *key == config_key {
        states.move_backward = true;
      }
    } else if check_modifier(key, &config.keyboard.move_backward) {
      states.move_backward = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.move_left) {
      if *key == config_key {
        states.move_left = true;
      }
    } else if check_modifier(key, &config.keyboard.move_left) {
      states.move_left = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.move_right) {
      if *key == config_key {
        states.move_right = true;
      }
    } else if check_modifier(key, &config.keyboard.move_right) {
      states.move_right = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.move_up) {
      if *key == config_key {
        states.move_up = true;
      }
    } else if check_modifier(key, &config.keyboard.move_up) {
      states.move_up = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.move_down) {
      if *key == config_key {
        states.move_down = true;
      }
    } else if check_modifier(key, &config.keyboard.move_down) {
      states.move_down = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.pitch_up) {
      if *key == config_key {
        states.pitch_up = true;
      }
    } else if check_modifier(key, &config.keyboard.pitch_up) {
      states.pitch_up = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.pitch_down) {
      if *key == config_key {
        states.pitch_down = true;
      }
    } else if check_modifier(key, &config.keyboard.pitch_down) {
      states.pitch_down = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.yaw_left) {
      if *key == config_key {
        states.yaw_left = true;
      }
    } else if check_modifier(key, &config.keyboard.yaw_left) {
      states.yaw_left = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.yaw_right) {
      if *key == config_key {
        states.yaw_right = true;
      }
    } else if check_modifier(key, &config.keyboard.yaw_right) {
      states.yaw_right = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.roll_left) {
      if *key == config_key {
        states.roll_left = true;
      }
    } else if check_modifier(key, &config.keyboard.roll_left) {
      states.roll_left = true;
    }

    if let Ok(config_key) = Keycode::from_str(&config.keyboard.roll_right) {
      if *key == config_key {
        states.roll_right = true;
      }
    } else if check_modifier(key, &config.keyboard.roll_right) {
      states.roll_right = true;
    }
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
}

fn get_gamepad_input<R: Runtime>(
  gilrs: &mut Gilrs,
  app_handle: &AppHandle<R>,
) -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let mut control_array = [0.0; 6];

  while let Some(event) = gilrs.next_event() {
    let gamepad = gilrs.gamepad(event.id);
    let payload = gamepad_to_json(gamepad, event.event, event.time);
    let _ = app_handle.emit("gamepad_event", payload);
  }

  if let Some((_id, gamepad)) = gilrs.gamepads().next() {
    match config.gamepad.move_horizontal {
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
      ControlSource::FaceButtons => {
        control_array[0] = if gamepad.is_pressed(Button::North) {
          1.0
        } else if gamepad.is_pressed(Button::South) {
          -1.0
        } else {
          0.0
        };
        control_array[1] = if gamepad.is_pressed(Button::East) {
          1.0
        } else if gamepad.is_pressed(Button::West) {
          -1.0
        } else {
          0.0
        };
      }
    }

    match config.gamepad.pitch_yaw {
      ControlSource::LeftStick => {
        control_array[3] = -gamepad.value(Axis::LeftStickY);
        control_array[4] = gamepad.value(Axis::LeftStickX);
      }
      ControlSource::RightStick => {
        control_array[3] = -gamepad.value(Axis::RightStickY);
        control_array[4] = gamepad.value(Axis::RightStickX);
      }
      ControlSource::DPad => {
        control_array[3] = if gamepad.is_pressed(Button::DPadUp) {
          1.0
        } else if gamepad.is_pressed(Button::DPadDown) {
          -1.0
        } else {
          0.0
        };
        control_array[4] = if gamepad.is_pressed(Button::DPadRight) {
          1.0
        } else if gamepad.is_pressed(Button::DPadLeft) {
          -1.0
        } else {
          0.0
        };
      }
      ControlSource::FaceButtons => {
        control_array[3] = if gamepad.is_pressed(Button::North) {
          1.0
        } else if gamepad.is_pressed(Button::South) {
          -1.0
        } else {
          0.0
        };
        control_array[4] = if gamepad.is_pressed(Button::East) {
          1.0
        } else if gamepad.is_pressed(Button::West) {
          -1.0
        } else {
          0.0
        };
      }
    }

    let mut up_pressed = false;
    let mut down_pressed = false;

    if let Ok(btn_code) = config.gamepad.move_up.parse::<u16>() {
      let button = button_from_u16(btn_code);
      up_pressed = gamepad.is_pressed(button);
    }

    if let Ok(btn_code) = config.gamepad.move_down.parse::<u16>() {
      let button = button_from_u16(btn_code);
      down_pressed = gamepad.is_pressed(button);
    }

    control_array[2] = match (up_pressed, down_pressed) {
      (true, false) => 1.0,
      (false, true) => -1.0,
      _ => 0.0,
    };

    let mut roll_right_pressed = false;
    let mut roll_left_pressed = false;

    if let Ok(btn_code) = config.gamepad.roll_right.parse::<u16>() {
      let button = button_from_u16(btn_code);
      roll_right_pressed = gamepad.is_pressed(button);
    }

    if let Ok(btn_code) = config.gamepad.roll_left.parse::<u16>() {
      let button = button_from_u16(btn_code);
      roll_left_pressed = gamepad.is_pressed(button);
    }

    control_array[5] = match (roll_right_pressed, roll_left_pressed) {
      (true, false) => 1.0,
      (false, true) => -1.0,
      _ => 0.0,
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

pub async fn start_input_handler<R: Runtime>(
  window: WebviewWindow,
  input_tx: Sender<[f32; 6]>,
  app_handle: &AppHandle<R>,
) {
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
    let gamepad_input = get_gamepad_input(&mut gilrs, &app_handle).unwrap_or([0.0; 6]);

    let final_input = merge_inputs(keyboard_input, gamepad_input);

    let _ = input_tx.send(final_input).await;
  }
}

pub fn update_config(new_config: &Config) {
  if let Ok(mut config) = CURRENT_CONFIG.lock() {
    *config = new_config.clone();
  }
}
