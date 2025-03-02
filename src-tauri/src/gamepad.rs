use gilrs::{Axis, Button};

use std::u16;

pub const BTN_UNKNOWN: u16 = 0;

pub const BTN_SOUTH: u16 = 1;
pub const BTN_EAST: u16 = 2;
pub const BTN_C: u16 = 3;
pub const BTN_NORTH: u16 = 4;
pub const BTN_WEST: u16 = 5;
pub const BTN_Z: u16 = 6;
pub const BTN_LT: u16 = 7;
pub const BTN_RT: u16 = 8;
pub const BTN_LT2: u16 = 9;
pub const BTN_RT2: u16 = 10;
pub const BTN_SELECT: u16 = 11;
pub const BTN_START: u16 = 12;
pub const BTN_MODE: u16 = 13;
pub const BTN_LTHUMB: u16 = 14;
pub const BTN_RTHUMB: u16 = 15;

pub const BTN_DPAD_UP: u16 = 16;
pub const BTN_DPAD_DOWN: u16 = 17;
pub const BTN_DPAD_LEFT: u16 = 18;
pub const BTN_DPAD_RIGHT: u16 = 19;

pub const AXIS_UNKNOWN: u16 = 0;

pub const AXIS_LSTICKX: u16 = 1;
pub const AXIS_LSTICKY: u16 = 2;
pub const AXIS_LEFTZ: u16 = 3;
pub const AXIS_RSTICKX: u16 = 4;
pub const AXIS_RSTICKY: u16 = 5;
pub const AXIS_RIGHTZ: u16 = 6;
pub const AXIS_DPADX: u16 = 7;
pub const AXIS_DPADY: u16 = 8;

pub fn button_from_u16(id: u16) -> Button {
  match id {
    BTN_SOUTH => Button::South,
    BTN_EAST => Button::East,
    BTN_C => Button::C,
    BTN_NORTH => Button::North,
    BTN_WEST => Button::West,
    BTN_Z => Button::Z,
    BTN_LT => Button::LeftTrigger,
    BTN_RT => Button::RightTrigger,
    BTN_LT2 => Button::LeftTrigger2,
    BTN_RT2 => Button::RightTrigger2,
    BTN_SELECT => Button::Select,
    BTN_START => Button::Start,
    BTN_MODE => Button::Mode,
    BTN_LTHUMB => Button::LeftThumb,
    BTN_RTHUMB => Button::RightThumb,
    BTN_DPAD_UP => Button::DPadUp,
    BTN_DPAD_DOWN => Button::DPadDown,
    BTN_DPAD_LEFT => Button::DPadLeft,
    BTN_DPAD_RIGHT => Button::DPadRight,
    BTN_UNKNOWN => Button::Unknown,
    _ => Button::Unknown,
  }
}

pub fn axis_from_u16(id: u16) -> Axis {
  match id {
    AXIS_LSTICKX => Axis::LeftStickX,
    AXIS_LSTICKY => Axis::LeftStickY,
    AXIS_LEFTZ => Axis::LeftZ,
    AXIS_RSTICKX => Axis::RightStickX,
    AXIS_RSTICKY => Axis::RightStickY,
    AXIS_RIGHTZ => Axis::RightZ,
    AXIS_DPADX => Axis::DPadX,
    AXIS_DPADY => Axis::DPadY,
    AXIS_UNKNOWN => Axis::Unknown,
    _ => Axis::Unknown,
  }
}

pub fn gamepad_to_json(
  gamepad: gilrs::Gamepad,
  event: gilrs::EventType,
  time: std::time::SystemTime,
) -> serde_json::Value {
  // TODO: pull from the device itself
  let num_of_axes: u16 = 12;
  let num_of_buttons: u16 = 20;

  let id = format!("{:?}", gamepad.id());
  let timestamp = time
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_millis();
  let name = gamepad.name();
  let connected = gamepad.is_connected();

  // TODO: not supported in gilrs yet, but works in sdl2
  let vibration = gamepad.is_ff_supported();

  let uuid = uuid::Uuid::from_bytes(gamepad.uuid())
    .as_hyphenated()
    .to_string();
  let mapping = match gamepad.mapping_source() {
    gilrs::MappingSource::SdlMappings => "standard",
    _ => "",
  };
  let power_info = gamepad.power_info();

  let axes: Vec<f32> = (0 as u16..num_of_axes)
    .map(|idx| gamepad.axis_data(axis_from_u16(idx)))
    .map(|o| match o {
      Some(&axis) => axis.value(),
      None => 0.0,
    })
    .collect();

  let buttons: Vec<f32> = (0 as u16..num_of_buttons)
    .map(|idx| gamepad.button_data(button_from_u16(idx)))
    .map(|o| match o {
      Some(button) => button.value(),
      None => 0.0,
    })
    .collect();

  let json = serde_json::json!({
      "id": id,
      "uuid": uuid,
      "connected": connected,
      "vibration": vibration,
      "event": format!("{:?}", event),
      "timestamp": timestamp,
      "name": name,
      "buttons": buttons,
      "axes": axes,
      "mapping": mapping,
      "power_info": format!("{:?}", power_info),
  });

  json
}
