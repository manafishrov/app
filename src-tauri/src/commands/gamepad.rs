use crate::gamepad::gamepad_to_json;
use gilrs::{Event, Gilrs};
use std::time::Duration;
use tauri::{command, AppHandle, Emitter, Runtime, Window};

#[command]
pub async fn execute_gamepad<R: Runtime>(app: AppHandle<R>, _window: Window<R>) {
  let mut gilrs = Gilrs::new().unwrap();

  loop {
    while let Some(Event {
      id, event, time, ..
    }) = gilrs.next_event()
    {
      let gamepad = gilrs.gamepad(id);
      let payload = gamepad_to_json(gamepad, event, time);
      app.emit("event", payload).unwrap();
    }
  }
}

#[command]
pub async fn vibrate_gamepad(
  gamepad_id: usize,
  duration_ms: u64,
  strong_magnitude: f32,
  weak_magnitude: f32,
) -> Result<(), String> {
  let mut gilrs = Gilrs::new().map_err(|e| e.to_string())?;

  if let Some(gamepad) = gilrs
    .gamepads()
    .find(|(_, pad)| pad.id().into() == gamepad_id)
  {
    let (_, mut gamepad) = gamepad;
    if gamepad.is_ff_supported() {
      let _ = gamepad.set_ff_rumble(
        strong_magnitude,
        weak_magnitude,
        Duration::from_millis(duration_ms),
      );
      return Ok(());
    }
    return Err("Gamepad does not support force feedback".to_string());
  }

  Err("Gamepad not found".to_string())
}
