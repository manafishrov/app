use crate::gamepad::{handle_gamepad_vibration, handle_start_gamepad_stream};
use tauri::{command, AppHandle, Runtime};

#[command]
pub async fn start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  handle_start_gamepad_stream(app);
}

#[command]
pub fn gamepad_vibrate(index: u32, low_freq: f32, high_freq: f32, duration_ms: u32) {
  handle_gamepad_vibration(index, low_freq, high_freq, duration_ms);
}
