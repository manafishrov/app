use crate::gamepad::{handle_start_gamepad_stream, VibrateCommand, VIBRATE_SENDER};
use tauri::{command, AppHandle, Runtime};

#[command]
pub async fn start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  handle_start_gamepad_stream(app);
}

#[command]
pub fn gamepad_vibrate(index: u32, low_freq: f32, high_freq: f32, duration_ms: u32) {
  if let Some(sender) = VIBRATE_SENDER.get() {
    let cmd = VibrateCommand {
      index,
      low_freq,
      high_freq,
      duration_ms,
    };
    let _ = sender.send(cmd);
  }
}
