use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime};

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

pub fn handle_start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  if GAMEPAD_STREAM_RUNNING.load(Ordering::Relaxed) {
    return;
  }
  GAMEPAD_STREAM_RUNNING.store(true, Ordering::Relaxed);

  let (tx, rx) = mpsc::channel::<VibrateCommand>();
  VIBRATE_SENDER.set(tx).unwrap();

  thread::spawn(move || {
    let sdl_context = sdl2::init().unwrap();
    let controller_subsystem = sdl_context.game_controller().unwrap();
    let mut event_pump = sdl_context.event_pump().unwrap();

    controller_subsystem
      .load_mappings("assets/gamecontrollerdb.txt")
      .ok();

    let mut controllers: std::collections::HashMap<u32, sdl2::controller::GameController> =
      std::collections::HashMap::new();

    for i in 0..controller_subsystem.num_joysticks().unwrap_or(0) {
      if controller_subsystem.is_game_controller(i) {
        if let Ok(controller) = controller_subsystem.open(i) {
          let instance_id = controller.instance_id();
          controllers.insert(instance_id, controller);
          let payload = gamepad_to_json(&controllers[&instance_id]);
          app.emit("gamepad_event", payload).unwrap();
        }
      }
    }

    loop {
      while let Ok(cmd) = rx.try_recv() {
        if let Some(controller) = controllers.get_mut(&cmd.index) {
          let low = (cmd.low_freq * 65535.0) as u16;
          let high = (cmd.high_freq * 65535.0) as u16;
          controller.set_rumble(low, high, cmd.duration_ms).ok();
        }
      }

      for event in event_pump.poll_iter() {
        use sdl2::event::Event;
        match event {
          Event::ControllerDeviceAdded { which, .. } => {
            if controller_subsystem.is_game_controller(which) {
              if let Ok(controller) = controller_subsystem.open(which) {
                let instance_id = controller.instance_id();
                controllers.insert(instance_id, controller);
                let payload = gamepad_to_json(&controllers[&instance_id]);
                app.emit("gamepad_event", payload).unwrap();
              }
            }
          }
          Event::ControllerDeviceRemoved { which, .. } => {
            if let Some(mut controller) = controllers.remove(&which) {
              controller.set_rumble(0, 0, 0).ok(); // Stop rumble
              let mut payload = gamepad_to_json(&controller);
              if let serde_json::Value::Object(ref mut map) = payload {
                map.insert("connected".to_string(), serde_json::Value::Bool(false));
              }
              app.emit("gamepad_event", payload).unwrap();
            }
          }
          Event::ControllerAxisMotion { which, .. }
          | Event::ControllerButtonDown { which, .. }
          | Event::ControllerButtonUp { which, .. } => {
            if let Some(controller) = controllers.get(&which) {
              let payload = gamepad_to_json(controller);
              app.emit("gamepad_event", payload).unwrap();
            }
          }
          _ => {}
        }
      }

      for controller in controllers.values() {
        let payload = gamepad_to_json(controller);
        app.emit("gamepad_event", payload).unwrap();
      }

      thread::sleep(Duration::from_millis(16));
    }
  });
}

use sdl2::controller::{Axis, Button, GameController};
use serde_json::json;

pub fn gamepad_to_json(controller: &GameController) -> serde_json::Value {
  fn normalize_axis(value: i16) -> f32 {
    value as f32 / 32767.0
  }

  fn create_button_json(pressed: bool) -> serde_json::Value {
    json!({"pressed": pressed, "value": if pressed { 1.0 } else { 0.0 }})
  }

  fn create_trigger_json(value: i16) -> serde_json::Value {
    let normalized = normalize_axis(value);
    json!({"pressed": value > 3277, "value": normalized})
  }

  let id = controller.name().clone();
  let index = controller.instance_id();
  let connected = controller.attached();
  let mapping = controller.mapping();

  let axes: Vec<f32> = vec![
    normalize_axis(controller.axis(Axis::LeftX)),
    normalize_axis(controller.axis(Axis::LeftY)),
    normalize_axis(controller.axis(Axis::RightX)),
    normalize_axis(controller.axis(Axis::RightY)),
  ];

  let mut buttons: Vec<serde_json::Value> = vec![
    create_button_json(controller.button(Button::A)),
    create_button_json(controller.button(Button::B)),
    create_button_json(controller.button(Button::X)),
    create_button_json(controller.button(Button::Y)),
    create_button_json(controller.button(Button::LeftShoulder)),
    create_button_json(controller.button(Button::RightShoulder)),
    create_trigger_json(controller.axis(Axis::TriggerLeft)),
    create_trigger_json(controller.axis(Axis::TriggerRight)),
    create_button_json(controller.button(Button::Back)),
    create_button_json(controller.button(Button::Start)),
    create_button_json(controller.button(Button::LeftStick)),
    create_button_json(controller.button(Button::RightStick)),
    create_button_json(controller.button(Button::DPadUp)),
    create_button_json(controller.button(Button::DPadDown)),
    create_button_json(controller.button(Button::DPadLeft)),
    create_button_json(controller.button(Button::DPadRight)),
    create_button_json(controller.button(Button::Guide)),
  ];

  buttons.push(create_button_json(controller.button(Button::Paddle1)));
  buttons.push(create_button_json(controller.button(Button::Paddle2)));
  buttons.push(create_button_json(controller.button(Button::Paddle3)));
  buttons.push(create_button_json(controller.button(Button::Paddle4)));
  buttons.push(create_button_json(controller.button(Button::Touchpad)));

  let timestamp = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_millis();

  let vibration_actuator = if controller.has_rumble() {
    json!({"type": "dual-rumble"})
  } else {
    serde_json::Value::Null
  };

  serde_json::json!({
      "id": id,
      "index": index,
      "connected": connected,
      "mapping": mapping,
      "axes": axes,
      "buttons": buttons,
      "timestamp": timestamp,
      "vibrationActuator": vibration_actuator,
  })
}
