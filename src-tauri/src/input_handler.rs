use crate::commands::config::get_config;
use crate::gamepad::{gamepad_to_json, get_gamepad_input};
use crate::keyboard::get_keyboard_input;
use crate::models::config::Config;
use once_cell::sync::Lazy;
use sdl2::controller::GameController;
use sdl2::event::Event;
use sdl2::keyboard::KeyboardState;
use sdl2::GameControllerSubsystem;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Runtime, WebviewWindow, WindowEvent};
use tokio::sync::mpsc::Sender;

static CURRENT_CONFIG: Lazy<Arc<Mutex<Config>>> =
  Lazy::new(|| Arc::new(Mutex::new(get_config().unwrap_or_default())));

static IS_FOCUSED: Lazy<Arc<AtomicBool>> = Lazy::new(|| Arc::new(AtomicBool::new(true)));

pub fn merge_inputs(keyboard: [f32; 6], gamepad: [f32; 6]) -> [f32; 6] {
  let mut result = [0.0; 6];
  for i in 0..6 {
    result[i] = (keyboard[i] + gamepad[i]).clamp(-1.0, 1.0);
  }
  result
}

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

pub fn start_input_handler<R: Runtime>(
  window: WebviewWindow,
  input_tx: Sender<[f32; 6]>,
  app_handle: AppHandle<R>,
) {
  let config_clone = Arc::clone(&CURRENT_CONFIG);
  let focused_clone = Arc::clone(&IS_FOCUSED);
  let input_tx_clone = input_tx.clone();
  let app_handle_clone = app_handle.clone();

  let focus_flag_for_event_handler = Arc::clone(&IS_FOCUSED);
  window.on_window_event(move |event| {
    if let WindowEvent::Focused(focused) = event {
      focus_flag_for_event_handler.store(*focused, Ordering::Relaxed);
    }
  });

  let focus_flag_for_initial_check = Arc::clone(&IS_FOCUSED);
  if let Ok(focused) = window.is_focused() {
    focus_flag_for_initial_check.store(focused, Ordering::Relaxed);
  }

  thread::spawn(move || -> Result<(), String> {
    let sdl_context = sdl2::init()?;
    let controller_subsystem = sdl_context.game_controller()?;
    let mut game_controller = open_first_controller(&controller_subsystem);
    let mut event_pump = sdl_context.event_pump()?;

    println!("Starting SDL input loop...");

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
              }
            }
          }
          _ => {}
        }
      }

      if !focused_clone.load(Ordering::Relaxed) {
        let zero_input = [0.0; 6];
        if input_tx_clone.blocking_send(zero_input).is_err() {
          eprintln!("Input channel closed, shutting down input handler.");
          break;
        }
        thread::sleep(Duration::from_millis(100));
        continue;
      }

      let config = match config_clone.lock() {
        Ok(guard) => guard.clone(),
        Err(e) => {
          eprintln!("Failed to lock config mutex: {}. Using default.", e);
          Config::default()
        }
      };

      let keyboard_state = KeyboardState::new(&event_pump);
      let keyboard_input = get_keyboard_input(&keyboard_state, &config).unwrap_or([0.0; 6]);

      let gamepad_input = match &game_controller {
        Some(controller) => {
          let payload = gamepad_to_json(controller);
          let _ = app_handle_clone.emit("gamepad_event", payload);
          get_gamepad_input(Some(controller), &config)
        }
        None => [0.0; 6],
      };

      let final_input = merge_inputs(keyboard_input, gamepad_input);
      if input_tx_clone.blocking_send(final_input).is_err() {
        eprintln!("Input channel closed, shutting down input handler.");
        break;
      }

      thread::sleep(Duration::from_millis(16));
    }

    println!("SDL input loop finished.");
    Ok(())
  });
}

pub fn update_config(new_config: &Config) {
  if let Ok(mut config_guard) = CURRENT_CONFIG.lock() {
    *config_guard = new_config.clone();
  }
}
