use crate::commands::config::get_config;
use crate::gamepad::get_gamepad_input;
use crate::keyboard::get_keyboard_input;
use crate::models::config::Config;
use once_cell::sync::Lazy;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Runtime, WebviewWindow};
use tokio::sync::mpsc::Sender;

static CURRENT_CONFIG: Lazy<Mutex<Config>> =
  Lazy::new(|| Mutex::new(get_config().unwrap_or_default()));

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
  let window_clone = window.clone();
  let app_handle_clone = app_handle.clone();
  let input_tx_clone = input_tx.clone();

  if let Err(e) = thread::spawn(move || -> Result<(), String> {
    // Use std::panic::catch_unwind for the SDL initialization
    match std::panic::catch_unwind(|| {
      let sdl_context = sdl2::init()?;
      let _video_subsystem = sdl_context.video()?;
      let controller_subsystem = sdl_context.game_controller()?;

      let available = controller_subsystem.num_joysticks()?;
      let mut game_controller = None;

      for id in 0..available {
        if controller_subsystem.is_game_controller(id) {
          match controller_subsystem.open(id) {
            Ok(controller) => {
              println!("Found game controller: {}", controller.name());
              game_controller = Some(controller);
              break;
            }
            Err(e) => println!("Failed to open controller {}: {}", id, e),
          }
        }
      }

      let mut event_pump = sdl_context.event_pump()?;

      // Main loop
      loop {
        thread::sleep(Duration::from_millis(16));

        // Safely pump events with error handling
        match std::panic::catch_unwind(|| {
          event_pump.pump_events();
        }) {
          Ok(_) => {}
          Err(_) => {
            println!("Caught panic while pumping events");
            let zero_input = [0.0; 6];
            let _ = tokio::runtime::Handle::current().block_on(input_tx_clone.send(zero_input));
            continue;
          }
        }

        let is_focused = match window_clone.is_focused() {
          Ok(focused) => focused,
          Err(_) => false,
        };

        if !is_focused {
          let zero_input = [0.0; 6];
          let _ = tokio::runtime::Handle::current().block_on(input_tx_clone.send(zero_input));
          continue;
        }

        let config = match CURRENT_CONFIG.lock() {
          Ok(config) => config.clone(),
          Err(_) => Config::default(),
        };

        // Wrap keyboard input handling in catch_unwind
        let keyboard_input = match std::panic::catch_unwind(|| {
          get_keyboard_input(&event_pump.keyboard_state(), &config)
        }) {
          Ok(Ok(input)) => input,
          _ => [0.0; 6],
        };

        // Wrap gamepad input handling in catch_unwind
        let gamepad_input = match &game_controller {
          Some(controller) => {
            match std::panic::catch_unwind(|| {
              get_gamepad_input(Some(controller), &config, &app_handle_clone)
            }) {
              Ok(input) => input,
              Err(_) => [0.0; 6],
            }
          }
          None => [0.0; 6],
        };

        let final_input = merge_inputs(keyboard_input, gamepad_input);

        let _ = tokio::runtime::Handle::current().block_on(input_tx_clone.send(final_input));
      }
    }) {
      Ok(result) => result,
      Err(e) => {
        if let Some(s) = e.downcast_ref::<&str>() {
          Err(s.to_string())
        } else {
          Err("SDL2 initialization panicked with unknown error".to_string())
        }
      }
    }
  })
  .join()
  {
    println!("Input handler thread panicked: {:?}", e);
  }
}

pub fn update_config(new_config: &Config) {
  if let Ok(mut config) = CURRENT_CONFIG.lock() {
    *config = new_config.clone();
  }
}
