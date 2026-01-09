use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc;
use std::thread;
use std::time::Duration;

use serde_json::json;
use tauri::{AppHandle, Emitter, Runtime};

// use sdl2::controller::{Axis, Button, GameController};
// use sdl2::event::Event;
// use sdl2::joystick::Joystick;

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

pub fn handle_start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  if GAMEPAD_STREAM_RUNNING.swap(true, Ordering::Relaxed) {
    return;
  }

  let (tx, rx) = mpsc::channel::<VibrateCommand>();
  let _ = VIBRATE_SENDER.set(tx);

  // thread::spawn(move || {
  //   let sdl = sdl2::init().unwrap();
  //
  //   let controller_subsystem = sdl.game_controller().unwrap();
  //   let joystick_subsystem = sdl.joystick().unwrap();
  //   let mut event_pump = sdl.event_pump().unwrap();
  //
  //   controller_subsystem
  //     .load_mappings("assets/gamecontrollerdb.txt")
  //     .ok();
  //
  //   let mut controllers: HashMap<u32, GameController> = HashMap::new();
  //   let mut joysticks: HashMap<u32, Joystick> = HashMap::new();
  //
  //   let num = joystick_subsystem.num_joysticks().unwrap_or(0);
  //   for i in 0..num {
  //     if controller_subsystem.is_game_controller(i) {
  //       if let Ok(c) = controller_subsystem.open(i) {
  //         let id = c.instance_id();
  //         controllers.insert(id, c);
  //         app
  //           .emit("gamepad_event", gamecontroller_to_json(&controllers[&id]))
  //           .unwrap();
  //       }
  //     } else if let Ok(j) = joystick_subsystem.open(i) {
  //       let id = j.instance_id();
  //       joysticks.insert(id, j);
  //       app
  //         .emit("gamepad_event", joystick_to_json(&joysticks[&id]))
  //         .unwrap();
  //     }
  //   }
  //
  //   loop {
  //     while let Ok(cmd) = rx.try_recv() {
  //       if let Some(c) = controllers.get_mut(&cmd.index) {
  //         let low = (cmd.low_freq * 65535.0) as u16;
  //         let high = (cmd.high_freq * 65535.0) as u16;
  //         let _ = c.set_rumble(low, high, cmd.duration_ms);
  //       }
  //     }
  //
  //     for event in event_pump.poll_iter() {
  //       match event {
  //         Event::ControllerDeviceAdded { which, .. } => {
  //           if let Ok(c) = controller_subsystem.open(which) {
  //             let id = c.instance_id();
  //             controllers.insert(id, c);
  //             app
  //               .emit("gamepad_event", gamecontroller_to_json(&controllers[&id]))
  //               .unwrap();
  //           }
  //         }
  //
  //         Event::ControllerDeviceRemoved { which, .. } => {
  //           if let Some(c) = controllers.remove(&which) {
  //             let mut payload = gamecontroller_to_json(&c);
  //             payload["connected"] = json!(false);
  //             app.emit("gamepad_event", payload).unwrap();
  //           }
  //         }
  //
  //         Event::JoyDeviceAdded { which, .. } => {
  //           if !controller_subsystem.is_game_controller(which) {
  //             if let Ok(j) = joystick_subsystem.open(which) {
  //               let id = j.instance_id();
  //               joysticks.insert(id, j);
  //               app
  //                 .emit("gamepad_event", joystick_to_json(&joysticks[&id]))
  //                 .unwrap();
  //             }
  //           }
  //         }
  //
  //         Event::JoyDeviceRemoved { which, .. } => {
  //           if let Some(j) = joysticks.remove(&which) {
  //             let mut payload = joystick_to_json(&j);
  //             payload["connected"] = json!(false);
  //             app.emit("gamepad_event", payload).unwrap();
  //           }
  //         }
  //
  //         Event::ControllerAxisMotion { which, .. }
  //         | Event::ControllerButtonDown { which, .. }
  //         | Event::ControllerButtonUp { which, .. } => {
  //           if let Some(c) = controllers.get(&which) {
  //             app
  //               .emit("gamepad_event", gamecontroller_to_json(c))
  //               .unwrap();
  //           }
  //         }
  //
  //         Event::JoyAxisMotion { which, .. }
  //         | Event::JoyButtonDown { which, .. }
  //         | Event::JoyButtonUp { which, .. } => {
  //           if let Some(j) = joysticks.get(&which) {
  //             app.emit("gamepad_event", joystick_to_json(j)).unwrap();
  //           }
  //         }
  //
  //         _ => {}
  //       }
  //     }
  //
  //     thread::sleep(Duration::from_millis(16));
  //   }
  // });
}

// fn normalize_axis(v: i16) -> f32 {
//   v as f32 / 32767.0
// }
//
// fn now_ms() -> u128 {
//   std::time::SystemTime::now()
//     .duration_since(std::time::UNIX_EPOCH)
//     .unwrap()
//     .as_millis()
// }
//
// fn gamecontroller_to_json(c: &GameController) -> serde_json::Value {
//   json!({
//       "id": c.name(),
//       "index": c.instance_id(),
//       "connected": c.attached(),
//       "mapping": c.mapping(),
//       "axes": [
//           normalize_axis(c.axis(Axis::LeftX)),
//           normalize_axis(c.axis(Axis::LeftY)),
//           normalize_axis(c.axis(Axis::RightX)),
//           normalize_axis(c.axis(Axis::RightY))
//       ],
//       "buttons": [
//           button(c.button(Button::A)),
//           button(c.button(Button::B)),
//           button(c.button(Button::X)),
//           button(c.button(Button::Y)),
//           button(c.button(Button::LeftShoulder)),
//           button(c.button(Button::RightShoulder)),
//           trigger(c.axis(Axis::TriggerLeft)),
//           trigger(c.axis(Axis::TriggerRight)),
//           button(c.button(Button::Back)),
//           button(c.button(Button::Start)),
//           button(c.button(Button::LeftStick)),
//           button(c.button(Button::RightStick)),
//           button(c.button(Button::DPadUp)),
//           button(c.button(Button::DPadDown)),
//           button(c.button(Button::DPadLeft)),
//           button(c.button(Button::DPadRight)),
//           button(c.button(Button::Guide))
//       ],
//       "timestamp": now_ms(),
//       "vibrationActuator": if c.has_rumble() {
//           json!({ "type": "dual-rumble" })
//       } else {
//           serde_json::Value::Null
//       }
//   })
// }
//
// fn joystick_to_json(j: &Joystick) -> serde_json::Value {
//   let axes = (0..j.num_axes())
//     .map(|i| normalize_axis(j.axis(i).unwrap_or(0)))
//     .collect::<Vec<_>>();
//
//   let buttons = (0..j.num_buttons())
//     .map(|i| button(j.button(i).unwrap_or(false)))
//     .collect::<Vec<_>>();
//
//   json!({
//       "id": j.name(),
//       "index": j.instance_id(),
//       "connected": j.attached(),
//       "mapping": serde_json::Value::Null,
//       "axes": axes,
//       "buttons": buttons,
//       "timestamp": now_ms(),
//       "vibrationActuator": serde_json::Value::Null
//   })
// }
//
// fn button(pressed: bool) -> serde_json::Value {
//   json!({
//       "pressed": pressed,
//       "value": if pressed { 1.0 } else { 0.0 }
//   })
// }
//
// fn trigger(v: i16) -> serde_json::Value {
//   let n = normalize_axis(v);
//   json!({
//       "pressed": v > 3277,
//       "value": n
//   })
// }
