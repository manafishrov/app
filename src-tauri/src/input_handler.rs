use crate::commands::config::get_config;
use crate::models::config::Config;
use crate::websocket_client::WebSocketClient;
use device_query::{DeviceQuery, DeviceState, Keycode};
use once_cell::sync::Lazy;
use std::str::FromStr;
use std::sync::Arc;
use std::sync::Mutex;
use tauri::WebviewWindow;
use tokio::runtime::Handle;

static DEVICE_STATE: Lazy<DeviceState> = Lazy::new(|| DeviceState::new());
static CURRENT_CONFIG: Lazy<Mutex<Config>> =
  Lazy::new(|| Mutex::new(get_config().unwrap_or_default()));

#[derive(Default)]
struct KeyStates {
  forward: bool,
  backward: bool,
  left: bool,
  right: bool,
  up: bool,
  down: bool,
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

pub fn get_input_array() -> Result<[f32; 6], String> {
  let config = CURRENT_CONFIG.lock().map_err(|e| e.to_string())?;
  let keys: Vec<Keycode> = DEVICE_STATE.get_keys();
  let mut states = KeyStates::default();

  for key in keys {
    if key == Keycode::from_str(&config.keyboard.move_forward).unwrap_or(Keycode::W) {
      states.forward = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_backward).unwrap_or(Keycode::S) {
      states.backward = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_left).unwrap_or(Keycode::A) {
      states.left = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_right).unwrap_or(Keycode::D) {
      states.right = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_up).unwrap_or(Keycode::Space) {
      states.up = true;
    }
    if key == Keycode::from_str(&config.keyboard.move_down).unwrap_or(Keycode::LShift) {
      states.down = true;
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
    process_key_pair(states.forward, states.backward),
    process_key_pair(states.right, states.left),
    process_key_pair(states.up, states.down),
    process_key_pair(states.rotate_right, states.rotate_left),
    process_key_pair(states.tilt_up, states.tilt_down),
    process_key_pair(states.tilt_right, states.tilt_left),
  ];

  Ok(control_array)
}

pub fn spawn_input_handler(
  window: WebviewWindow,
  ws_client: Arc<tokio::sync::Mutex<Option<WebSocketClient>>>,
  rt: Handle,
) -> std::thread::JoinHandle<()> {
  std::thread::spawn(move || loop {
    if window.is_focused().unwrap_or(false) {
      if let Ok(array) = get_input_array() {
        let ws_client = ws_client.clone();
        rt.spawn(async move {
          if let Some(client) = ws_client.lock().await.as_ref() {
            if let Err(e) = client.send_input(array).await {
              eprintln!("Failed to send input: {}", e);
            }
          }
        });
      }
    }
    std::thread::sleep(std::time::Duration::from_millis(16));
  })
}

pub fn update_config(new_config: Config) {
  if let Ok(mut config) = CURRENT_CONFIG.lock() {
    *config = new_config;
  }
}
