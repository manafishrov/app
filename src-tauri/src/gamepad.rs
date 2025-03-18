use crate::models::config::{Config, ControlSource};
use once_cell::sync::Lazy;
use sdl2::controller::{
  Axis as GameControllerAxis, Button as GameControllerButton, GameController,
};
use std::collections::HashMap;
use std::panic;
use tauri::{AppHandle, Emitter, Runtime};

#[derive(Clone)]
pub enum ControllerInput {
  Button(GameControllerButton),
  Axis(GameControllerAxis),
}

pub fn str_to_button(button_str: &str) -> Option<ControllerInput> {
  static BUTTON_MAP: Lazy<HashMap<&'static str, ControllerInput>> = Lazy::new(|| {
    let mut map = HashMap::new();
    map.insert("0", ControllerInput::Button(GameControllerButton::A));
    map.insert("1", ControllerInput::Button(GameControllerButton::B));
    map.insert("2", ControllerInput::Button(GameControllerButton::X));
    map.insert("3", ControllerInput::Button(GameControllerButton::Y));
    map.insert(
      "4",
      ControllerInput::Button(GameControllerButton::LeftShoulder),
    );
    map.insert(
      "5",
      ControllerInput::Button(GameControllerButton::RightShoulder),
    );
    map.insert("6", ControllerInput::Axis(GameControllerAxis::TriggerLeft));
    map.insert("7", ControllerInput::Axis(GameControllerAxis::TriggerRight));
    map.insert("8", ControllerInput::Button(GameControllerButton::Back));
    map.insert("9", ControllerInput::Button(GameControllerButton::Start));
    map.insert("10", ControllerInput::Button(GameControllerButton::Guide));
    map.insert(
      "11",
      ControllerInput::Button(GameControllerButton::LeftStick),
    );
    map.insert(
      "12",
      ControllerInput::Button(GameControllerButton::RightStick),
    );
    map.insert("13", ControllerInput::Button(GameControllerButton::DPadUp));
    map.insert(
      "14",
      ControllerInput::Button(GameControllerButton::DPadDown),
    );
    map.insert(
      "15",
      ControllerInput::Button(GameControllerButton::DPadLeft),
    );
    map.insert(
      "16",
      ControllerInput::Button(GameControllerButton::DPadRight),
    );
    map
  });

  BUTTON_MAP.get(button_str).cloned()
}

pub fn is_input_pressed(controller: &GameController, input: &str) -> bool {
  match std::panic::catch_unwind(|| {
    if let Some(controller_input) = str_to_button(input) {
      match controller_input {
        ControllerInput::Button(btn) => controller.button(btn),
        ControllerInput::Axis(axis) => controller.axis(axis) as f32 / 32767.0 > 0.1,
      }
    } else {
      false
    }
  }) {
    Ok(result) => result,
    Err(_) => {
      println!("Caught panic in is_input_pressed");
      false
    }
  }
}

pub fn gamepad_to_json(controller: &GameController) -> serde_json::Value {
  match std::panic::catch_unwind(|| {
    let id = controller.instance_id();
    let timestamp = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .unwrap()
      .as_millis();
    let name = controller.name();
    let connected = true;
    let vibration = controller.has_rumble();

    let mapping = if controller.attached() {
      "standard"
    } else {
      ""
    };

    let axes: Vec<f32> = vec![
      controller.axis(GameControllerAxis::LeftX) as f32 / 32768.0,
      controller.axis(GameControllerAxis::LeftY) as f32 / 32768.0,
      controller.axis(GameControllerAxis::RightX) as f32 / 32768.0,
      controller.axis(GameControllerAxis::RightY) as f32 / 32768.0,
    ];

    let left_trigger_pressed =
      controller.axis(GameControllerAxis::TriggerLeft) as f32 / 32767.0 > 0.1;
    let right_trigger_pressed =
      controller.axis(GameControllerAxis::TriggerRight) as f32 / 32767.0 > 0.1;

    let buttons: Vec<f32> = vec![
      if controller.button(GameControllerButton::A) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::B) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::X) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::Y) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::LeftShoulder) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::RightShoulder) {
        1.0
      } else {
        0.0
      },
      if left_trigger_pressed { 1.0 } else { 0.0 },
      if right_trigger_pressed { 1.0 } else { 0.0 },
      if controller.button(GameControllerButton::Back) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::Start) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::Guide) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::LeftStick) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::RightStick) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::DPadUp) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::DPadDown) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::DPadLeft) {
        1.0
      } else {
        0.0
      },
      if controller.button(GameControllerButton::DPadRight) {
        1.0
      } else {
        0.0
      },
    ];

    serde_json::json!({
        "id": id.to_string(),
        "connected": connected,
        "vibration": vibration,
        "timestamp": timestamp,
        "name": name,
        "buttons": buttons,
        "axes": axes,
        "mapping": mapping,
    })
  }) {
    Ok(json) => json,
    Err(_) => {
      println!("Caught panic in gamepad_to_json");
      serde_json::json!({
        "id": "unknown",
        "connected": false,
        "vibration": false,
        "timestamp": 0,
        "name": "Error",
        "buttons": [0.0; 17],
        "axes": [0.0; 4],
        "mapping": "",
      })
    }
  }
}

pub fn get_gamepad_input<R: Runtime>(
  controller: Option<&GameController>,
  config: &Config,
  app_handle: &AppHandle<R>,
) -> [f32; 6] {
  let mut control_array = [0.0; 6];

  if let Some(controller) = controller {
    let controller_input = std::panic::catch_unwind(|| {
      let payload = gamepad_to_json(controller);
      let _ = app_handle.emit("gamepad_event", payload);

      let mut local_control_array = [0.0; 6];
      match config.gamepad.move_horizontal {
        ControlSource::LeftStick => {
          local_control_array[0] = -controller.axis(GameControllerAxis::LeftY) as f32 / 32768.0;
          local_control_array[1] = controller.axis(GameControllerAxis::LeftX) as f32 / 32768.0;
        }
        ControlSource::RightStick => {
          local_control_array[0] = -controller.axis(GameControllerAxis::RightY) as f32 / 32768.0;
          local_control_array[1] = controller.axis(GameControllerAxis::RightX) as f32 / 32768.0;
        }
        ControlSource::DPad => {
          local_control_array[0] = if controller.button(GameControllerButton::DPadUp) {
            1.0
          } else if controller.button(GameControllerButton::DPadDown) {
            -1.0
          } else {
            0.0
          };
          local_control_array[1] = if controller.button(GameControllerButton::DPadRight) {
            1.0
          } else if controller.button(GameControllerButton::DPadLeft) {
            -1.0
          } else {
            0.0
          };
        }
        ControlSource::FaceButtons => {
          local_control_array[0] = if controller.button(GameControllerButton::Y) {
            1.0
          } else if controller.button(GameControllerButton::A) {
            -1.0
          } else {
            0.0
          };
          local_control_array[1] = if controller.button(GameControllerButton::B) {
            1.0
          } else if controller.button(GameControllerButton::X) {
            -1.0
          } else {
            0.0
          };
        }
      }

      match config.gamepad.pitch_yaw {
        ControlSource::LeftStick => {
          local_control_array[3] = controller.axis(GameControllerAxis::LeftY) as f32 / -32768.0;
          local_control_array[4] = controller.axis(GameControllerAxis::LeftX) as f32 / 32768.0;
        }
        ControlSource::RightStick => {
          local_control_array[3] = controller.axis(GameControllerAxis::RightY) as f32 / -32768.0;
          local_control_array[4] = controller.axis(GameControllerAxis::RightX) as f32 / 32768.0;
        }
        ControlSource::DPad => {
          local_control_array[3] = if controller.button(GameControllerButton::DPadUp) {
            1.0
          } else if controller.button(GameControllerButton::DPadDown) {
            -1.0
          } else {
            0.0
          };
          local_control_array[4] = if controller.button(GameControllerButton::DPadRight) {
            1.0
          } else if controller.button(GameControllerButton::DPadLeft) {
            -1.0
          } else {
            0.0
          };
        }
        ControlSource::FaceButtons => {
          local_control_array[3] = if controller.button(GameControllerButton::Y) {
            1.0
          } else if controller.button(GameControllerButton::A) {
            -1.0
          } else {
            0.0
          };
          local_control_array[4] = if controller.button(GameControllerButton::B) {
            1.0
          } else if controller.button(GameControllerButton::X) {
            -1.0
          } else {
            0.0
          };
        }
      }

      let up_pressed = is_input_pressed(controller, &config.gamepad.move_up);
      let down_pressed = is_input_pressed(controller, &config.gamepad.move_down);

      local_control_array[2] = match (up_pressed, down_pressed) {
        (true, false) => 1.0,
        (false, true) => -1.0,
        _ => 0.0,
      };

      let roll_right_pressed = is_input_pressed(controller, &config.gamepad.roll_right);
      let roll_left_pressed = is_input_pressed(controller, &config.gamepad.roll_left);

      local_control_array[5] = match (roll_right_pressed, roll_left_pressed) {
        (true, false) => 1.0,
        (false, true) => -1.0,
        _ => 0.0,
      };

      local_control_array
    });

    match controller_input {
      Ok(result) => control_array = result,
      Err(e) => {
        println!("Caught panic in gamepad handling: {:?}", e);
        return [0.0; 6];
      }
    }
  }

  control_array
    .iter_mut()
    .for_each(|v| *v = v.clamp(-1.0, 1.0));

  control_array
}
