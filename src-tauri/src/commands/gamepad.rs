use crate::gamepad::handle_start_gamepad_stream;
use tauri::{command, AppHandle, Runtime};

#[command]
pub async fn start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  handle_start_gamepad_stream(app);
}
