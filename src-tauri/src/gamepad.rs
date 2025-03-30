use crate::models::config::{Config, ControlSource};
use once_cell::sync::Lazy;
use sdl2::controller::{
  Axis as GameControllerAxis, Button as GameControllerButton, GameController,
};
use serde_json::json;
use std::collections::HashMap;

#[derive(Clone)]
pub enum ControllerInput {
  Button(GameControllerButton),
  Axis(GameControllerAxis),
}

fn normalize_axis(value: i16) -> f32 {
  value as f32 / 32767.0
}

pub fn gamepad_api_to_sdl2_controllerinput(button_str: &str) -> Option<ControllerInput> {
  static MAP: Lazy<HashMap<&'static str, ControllerInput>> = Lazy::new(|| {
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

  MAP.get(button_str).cloned()
}

pub fn get_input_value(controller: &GameController, input_str: &str) -> f32 {
  if let Some(controller_input) = gamepad_api_to_sdl2_controllerinput(input_str) {
    match controller_input {
      ControllerInput::Button(btn) => {
        if controller.button(btn) {
          1.0
        } else {
          0.0
        }
      }
      ControllerInput::Axis(axis @ GameControllerAxis::TriggerLeft)
      | ControllerInput::Axis(axis @ GameControllerAxis::TriggerRight) => {
        let raw_value = controller.axis(axis);
        ((raw_value as i32 + 32768) as f32 / 65535.0).clamp(0.0, 1.0)
      }
      ControllerInput::Axis(axis) => 0.0,
    }
  } else {
    0.0
  }
}

pub fn gamepad_to_json(controller: &GameController) -> serde_json::Value {
  fn create_button_json(pressed: bool) -> serde_json::Value {
    json!({"pressed": pressed, "value": if pressed { 1.0 } else { 0.0 }})
  }

  fn create_trigger_json(value: i16) -> serde_json::Value {
    let normalized = ((value as i32 + 32768) as f32 / 65535.0).clamp(0.0, 1.0);
    json!({"pressed": normalized > 0.1, "value": normalized})
  }

  let id = controller.name().clone();
  let index = controller.instance_id();
  let connected = controller.attached();
  let mapping = controller.mapping();

  let axes: Vec<f32> = vec![
    normalize_axis(controller.axis(GameControllerAxis::LeftX)),
    normalize_axis(controller.axis(GameControllerAxis::LeftY)),
    normalize_axis(controller.axis(GameControllerAxis::RightX)),
    normalize_axis(controller.axis(GameControllerAxis::RightY)),
  ];

  let buttons: Vec<serde_json::Value> = vec![
    create_button_json(controller.button(GameControllerButton::A)),
    create_button_json(controller.button(GameControllerButton::B)),
    create_button_json(controller.button(GameControllerButton::X)),
    create_button_json(controller.button(GameControllerButton::Y)),
    create_button_json(controller.button(GameControllerButton::LeftShoulder)),
    create_button_json(controller.button(GameControllerButton::RightShoulder)),
    create_trigger_json(controller.axis(GameControllerAxis::TriggerLeft)),
    create_trigger_json(controller.axis(GameControllerAxis::TriggerRight)),
    create_button_json(controller.button(GameControllerButton::Back)),
    create_button_json(controller.button(GameControllerButton::Start)),
    create_button_json(controller.button(GameControllerButton::LeftStick)),
    create_button_json(controller.button(GameControllerButton::RightStick)),
    create_button_json(controller.button(GameControllerButton::DPadUp)),
    create_button_json(controller.button(GameControllerButton::DPadDown)),
    create_button_json(controller.button(GameControllerButton::DPadLeft)),
    create_button_json(controller.button(GameControllerButton::DPadRight)),
    create_button_json(controller.button(GameControllerButton::Guide)),
  ];

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

pub fn get_gamepad_input(controller: Option<&GameController>, config: &Config) -> [f32; 6] {
  let mut control_array = [0.0; 6];

  if let Some(controller) = controller {
    let norm = normalize_axis;

    match config.gamepad.move_horizontal {
      ControlSource::LeftStick => {
        control_array[0] = -norm(controller.axis(GameControllerAxis::LeftY));
        control_array[1] = norm(controller.axis(GameControllerAxis::LeftX));
      }
      ControlSource::RightStick => {
        control_array[0] = -norm(controller.axis(GameControllerAxis::RightY));
        control_array[1] = norm(controller.axis(GameControllerAxis::RightX));
      }
      ControlSource::DPad => {
        control_array[0] = if controller.button(GameControllerButton::DPadUp) {
          1.0
        } else if controller.button(GameControllerButton::DPadDown) {
          -1.0
        } else {
          0.0
        };
        control_array[1] = if controller.button(GameControllerButton::DPadRight) {
          1.0
        } else if controller.button(GameControllerButton::DPadLeft) {
          -1.0
        } else {
          0.0
        };
      }
      ControlSource::FaceButtons => {
        control_array[0] = if controller.button(GameControllerButton::Y) {
          1.0
        } else if controller.button(GameControllerButton::A) {
          -1.0
        } else {
          0.0
        };
        control_array[1] = if controller.button(GameControllerButton::B) {
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
        control_array[3] = -norm(controller.axis(GameControllerAxis::LeftY));
        control_array[4] = norm(controller.axis(GameControllerAxis::LeftX));
      }
      ControlSource::RightStick => {
        control_array[3] = -norm(controller.axis(GameControllerAxis::RightY));
        control_array[4] = norm(controller.axis(GameControllerAxis::RightX));
      }
      ControlSource::DPad => {
        control_array[3] = if controller.button(GameControllerButton::DPadUp) {
          1.0
        } else if controller.button(GameControllerButton::DPadDown) {
          -1.0
        } else {
          0.0
        };
        control_array[4] = if controller.button(GameControllerButton::DPadRight) {
          1.0
        } else if controller.button(GameControllerButton::DPadLeft) {
          -1.0
        } else {
          0.0
        };
      }
      ControlSource::FaceButtons => {
        control_array[3] = if controller.button(GameControllerButton::Y) {
          1.0
        } else if controller.button(GameControllerButton::A) {
          -1.0
        } else {
          0.0
        };
        control_array[4] = if controller.button(GameControllerButton::B) {
          1.0
        } else if controller.button(GameControllerButton::X) {
          -1.0
        } else {
          0.0
        };
      }
    }

    let up_value = get_input_value(controller, &config.gamepad.move_up);
    let down_value = get_input_value(controller, &config.gamepad.move_down);
    control_array[2] = up_value - down_value;

    let roll_right_value = get_input_value(controller, &config.gamepad.roll_right);
    let roll_left_value = get_input_value(controller, &config.gamepad.roll_left);
    control_array[5] = roll_right_value - roll_left_value;
  }

  const DEADZONE: f32 = 0.05;
  control_array.iter_mut().for_each(|v| {
    *v = if v.abs() < DEADZONE { 0.0 } else { *v };
    *v = v.clamp(-1.0, 1.0);
  });

  control_array
}
