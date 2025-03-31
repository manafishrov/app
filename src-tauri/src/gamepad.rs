use sdl2::controller::{
  Axis as GameControllerAxis, Button as GameControllerButton, GameController,
};
use serde_json::json;

fn normalize_axis(value: i16) -> f32 {
  value as f32 / 32767.0
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
