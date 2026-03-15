use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use sdl2::controller::{Axis, Button, GameController};
use sdl2::event::Event;
use sdl2::joystick::Joystick;
use serde_json::json;
use tauri::{AppHandle, Emitter, Runtime};

use crate::{log_error, log_warn};

#[derive(Debug)]
pub struct VibrateCommand {
  pub index: u32,
  pub low_freq: f32,
  pub high_freq: f32,
  pub duration_ms: u32,
}

static GAMEPAD_STREAM_RUNNING: AtomicBool = AtomicBool::new(false);
pub static VIBRATE_SENDER: std::sync::OnceLock<mpsc::Sender<VibrateCommand>> =
  std::sync::OnceLock::new();

const RUMBLE_SCALE: f32 = 65_535.0;
const AXIS_MAX_VALUE: f32 = 32_767.0;
const TRIGGER_THRESHOLD: i16 = 3277;
const GAMEPAD_POLL_INTERVAL_MS: u64 = 16;

fn emit_gamepad_event<R: Runtime>(app: &AppHandle<R>, payload: serde_json::Value) {
  if let Err(error) = app.emit("gamepad_event", payload) {
    log_warn!("Failed to emit gamepad event: {error}");
  }
}

fn scale_rumble_frequency(value: f32) -> u16 {
  let target = value.clamp(0.0, 1.0) * RUMBLE_SCALE;
  let mut low = 0_u16;
  let mut high = u16::MAX;

  while low < high {
    let step = (high - low).div_ceil(2);
    let mid = low + step;

    if f32::from(mid) <= target {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  let next = low.saturating_add(1);
  if next != low && f32::from(next) - target < target - f32::from(low) {
    next
  } else {
    low
  }
}

/// # Errors
/// Returns an error if SDL initialization fails or the gamepad event loop
/// cannot access the controller subsystems.
fn run_gamepad_stream<R: Runtime>(
  app: &AppHandle<R>,
  rx: &mpsc::Receiver<VibrateCommand>,
) -> Result<(), String> {
  let sdl = sdl2::init()?;
  let controller_subsystem = sdl.game_controller()?;
  let joystick_subsystem = sdl.joystick()?;
  let mut event_pump = sdl.event_pump()?;

  controller_subsystem.load_mappings("assets/gamecontrollerdb.txt").ok();

  let mut controllers: HashMap<u32, GameController> = HashMap::new();
  let mut joysticks: HashMap<u32, Joystick> = HashMap::new();

  let num = joystick_subsystem.num_joysticks().unwrap_or(0);
  for i in 0..num {
    if controller_subsystem.is_game_controller(i) {
      if let Ok(controller) = controller_subsystem.open(i) {
        let id = controller.instance_id();
        let payload = gamecontroller_to_json(&controller);
        controllers.insert(id, controller);
        emit_gamepad_event(app, payload);
      }
    } else if let Ok(joystick) = joystick_subsystem.open(i) {
      let id = joystick.instance_id();
      let payload = joystick_to_json(&joystick);
      joysticks.insert(id, joystick);
      emit_gamepad_event(app, payload);
    }
  }

  loop {
    while let Ok(cmd) = rx.try_recv() {
      if let Some(controller) = controllers.get_mut(&cmd.index) {
        let low = scale_rumble_frequency(cmd.low_freq);
        let high = scale_rumble_frequency(cmd.high_freq);
        let _ = controller.set_rumble(low, high, cmd.duration_ms);
      }
    }

    for event in event_pump.poll_iter() {
      match event {
        Event::ControllerDeviceAdded { which, .. } => {
          if let Ok(controller) = controller_subsystem.open(which) {
            let id = controller.instance_id();
            let payload = gamecontroller_to_json(&controller);
            controllers.insert(id, controller);
            emit_gamepad_event(app, payload);
          }
        },

        Event::ControllerDeviceRemoved { which, .. } => {
          if let Some(controller) = controllers.remove(&which) {
            let mut payload = gamecontroller_to_json(&controller);
            payload["connected"] = json!(false);
            emit_gamepad_event(app, payload);
          }
        },

        Event::JoyDeviceAdded { which, .. } => {
          if !controller_subsystem.is_game_controller(which)
            && let Ok(joystick) = joystick_subsystem.open(which)
          {
            let id = joystick.instance_id();
            let payload = joystick_to_json(&joystick);
            joysticks.insert(id, joystick);
            emit_gamepad_event(app, payload);
          }
        },

        Event::JoyDeviceRemoved { which, .. } => {
          if let Some(joystick) = joysticks.remove(&which) {
            let mut payload = joystick_to_json(&joystick);
            payload["connected"] = json!(false);
            emit_gamepad_event(app, payload);
          }
        },

        Event::ControllerAxisMotion { which, .. }
        | Event::ControllerButtonDown { which, .. }
        | Event::ControllerButtonUp { which, .. } => {
          if let Some(controller) = controllers.get(&which) {
            emit_gamepad_event(app, gamecontroller_to_json(controller));
          }
        },

        Event::JoyAxisMotion { which, .. }
        | Event::JoyButtonDown { which, .. }
        | Event::JoyButtonUp { which, .. } => {
          if let Some(joystick) = joysticks.get(&which) {
            emit_gamepad_event(app, joystick_to_json(joystick));
          }
        },

        _ => {},
      }
    }

    thread::sleep(Duration::from_millis(GAMEPAD_POLL_INTERVAL_MS));
  }
}

pub fn handle_gamepad_vibration(index: u32, low_freq: f32, high_freq: f32, duration_ms: u32) {
  if let Some(sender) = VIBRATE_SENDER.get() {
    let _ = sender.send(VibrateCommand {
      index,
      low_freq,
      high_freq,
      duration_ms,
    });
  }
}

pub fn handle_start_gamepad_stream<R: Runtime>(app: &AppHandle<R>) {
  if GAMEPAD_STREAM_RUNNING.swap(true, Ordering::Relaxed) {
    return;
  }

  let (tx, rx) = mpsc::channel::<VibrateCommand>();
  let _ = VIBRATE_SENDER.set(tx);

  let app = app.clone();
  thread::spawn(move || {
    if let Err(error) = run_gamepad_stream(&app, &rx) {
      GAMEPAD_STREAM_RUNNING.store(false, Ordering::Relaxed);
      log_error!("Gamepad stream stopped: {error}");
    }
  });
}

fn normalize_axis(v: i16) -> f32 {
  f32::from(v) / AXIS_MAX_VALUE
}

fn now_ms() -> u128 {
  std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis()
}

fn gamecontroller_to_json(c: &GameController) -> serde_json::Value {
  json!({
      "id": c.name(),
      "index": c.instance_id(),
      "connected": c.attached(),
      "mapping": c.mapping(),
      "axes": [
          normalize_axis(c.axis(Axis::LeftX)),
          normalize_axis(c.axis(Axis::LeftY)),
          normalize_axis(c.axis(Axis::RightX)),
          normalize_axis(c.axis(Axis::RightY))
      ],
      "buttons": [
          button(c.button(Button::A)),
          button(c.button(Button::B)),
          button(c.button(Button::X)),
          button(c.button(Button::Y)),
          button(c.button(Button::LeftShoulder)),
          button(c.button(Button::RightShoulder)),
          trigger(c.axis(Axis::TriggerLeft)),
          trigger(c.axis(Axis::TriggerRight)),
          button(c.button(Button::Back)),
          button(c.button(Button::Start)),
          button(c.button(Button::LeftStick)),
          button(c.button(Button::RightStick)),
          button(c.button(Button::DPadUp)),
          button(c.button(Button::DPadDown)),
          button(c.button(Button::DPadLeft)),
          button(c.button(Button::DPadRight)),
          button(c.button(Button::Guide))
      ],
      "timestamp": now_ms(),
      "vibrationActuator": if c.has_rumble() {
          json!({ "type": "dual-rumble" })
      } else {
          serde_json::Value::Null
      }
  })
}

fn joystick_to_json(j: &Joystick) -> serde_json::Value {
  let axes = (0..j.num_axes())
    .map(|i| normalize_axis(j.axis(i).unwrap_or(0)))
    .collect::<Vec<_>>();

  let buttons = (0..j.num_buttons())
    .map(|i| button(j.button(i).unwrap_or(false)))
    .collect::<Vec<_>>();

  json!({
      "id": j.name(),
      "index": j.instance_id(),
      "connected": j.attached(),
      "mapping": serde_json::Value::Null,
      "axes": axes,
      "buttons": buttons,
      "timestamp": now_ms(),
      "vibrationActuator": serde_json::Value::Null
  })
}

fn button(pressed: bool) -> serde_json::Value {
  json!({
      "pressed": pressed,
      "value": if pressed { 1.0 } else { 0.0 }
  })
}

fn trigger(v: i16) -> serde_json::Value {
  let n = normalize_axis(v);
  json!({
      "pressed": v > TRIGGER_THRESHOLD,
      "value": n
  })
}
