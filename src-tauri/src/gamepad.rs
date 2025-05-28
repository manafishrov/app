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

  let buttons: Vec<serde_json::Value> = vec![
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
