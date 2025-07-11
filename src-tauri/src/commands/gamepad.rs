use crate::gamepad::gamepad_to_json;
use gilrs::{Event, Gilrs};
use tauri::{command, AppHandle, Emitter, Runtime, Window};

#[command]
pub async fn start_gamepad_stream<R: Runtime>(app: AppHandle<R>, _window: Window<R>) {
  let mut gilrs = Gilrs::new().unwrap();

  loop {
    while let Some(Event {
      id, event, time, ..
    }) = gilrs.next_event()
    {
      let gamepad = gilrs.gamepad(id);
      let payload = gamepad_to_json(gamepad, event, time);
      app.emit("gamepad_event", payload).unwrap();
    }
  }
}
