use crate::gamepad::gamepad_to_json;
use sdl2::controller::GameController;
use sdl2::event::Event;
use sdl2::GameControllerSubsystem;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Runtime, WebviewWindow};

fn open_first_controller(controller_subsystem: &GameControllerSubsystem) -> Option<GameController> {
  for id in 0..controller_subsystem.num_joysticks().unwrap_or(0) {
    if controller_subsystem.is_game_controller(id) {
      match controller_subsystem.open(id) {
        Ok(controller) => {
          println!("Found game controller: {}", controller.name());
          return Some(controller);
        }
        Err(e) => println!("Failed to open controller {}: {}", id, e),
      }
    }
  }
  None
}

pub fn start_gamepad_event_handler<R: Runtime>(_window: WebviewWindow, app_handle: AppHandle<R>) {
  let app_handle_clone = app_handle.clone();

  thread::spawn(move || -> Result<(), String> {
    let sdl_context = sdl2::init()?;
    let controller_subsystem = sdl_context.game_controller()?;
    let mut game_controller = open_first_controller(&controller_subsystem);
    let mut event_pump = sdl_context.event_pump()?;

    println!("Starting SDL gamepad event loop...");

    loop {
      for event in event_pump.poll_iter() {
        match event {
          Event::ControllerDeviceAdded { which, .. } => {
            if game_controller.is_none() {
              println!("Controller added: {}", which);
              game_controller = match controller_subsystem.open(which) {
                Ok(c) => {
                  println!("Opened new controller: {}", c.name());
                  Some(c)
                }
                Err(e) => {
                  println!("Failed to open added controller {}: {}", which, e);
                  None
                }
              };
            }
          }
          Event::ControllerDeviceRemoved { which, .. } => {
            if let Some(ref ctrl) = game_controller {
              if ctrl.instance_id() == which {
                println!("Active controller removed: {}", which);
                game_controller = None;
                let _ = app_handle_clone.emit("gamepad_event", serde_json::Value::Null);
              }
            }
          }
          _ => {}
        }
      }

      if let Some(controller) = &game_controller {
        if controller.attached() {
          let payload = gamepad_to_json(controller);
          let _ = app_handle_clone.emit("gamepad_event", payload);
        } else {
          println!(
            "Controller {} detached unexpectedly.",
            controller.instance_id()
          );
          game_controller = None;
          let _ = app_handle_clone.emit("gamepad_event", serde_json::Value::Null);
        }
      }

      thread::sleep(Duration::from_millis(50));
    }
  });
}
