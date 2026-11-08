use tauri::{AppHandle, Runtime, command};

#[cfg(desktop)]
#[command]
pub async fn start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  crate::gamepad::handle_start_gamepad_stream(&app);
}

#[cfg(desktop)]
#[command]
pub fn gamepad_vibrate(index: u32, low_freq: f32, high_freq: f32, duration_ms: u32) {
  crate::gamepad::handle_gamepad_vibration(index, low_freq, high_freq, duration_ms);
}

/// Mobile controllers come from the native plugin as the same `gamepad_event`
/// payloads the desktop SDL stream emits.
#[cfg(mobile)]
#[command]
pub async fn start_gamepad_stream<R: Runtime>(app: AppHandle<R>) {
  use std::sync::atomic::{AtomicBool, Ordering};

  use tauri::Emitter;
  use tauri_plugin_manafish_mobile::MobileExt;

  static STARTED: AtomicBool = AtomicBool::new(false);
  if STARTED.swap(true, Ordering::Relaxed) {
    return;
  }
  let emitter = app.clone();
  let result = app
    .mobile()
    .start_gamepad_stream(move |payload| {
      if let Err(error) = emitter.emit("gamepad_event", payload) {
        crate::log_warn!("Failed to emit gamepad event: {error}");
      }
    })
    .await;
  if let Err(error) = result {
    STARTED.store(false, Ordering::Relaxed);
    crate::log_error!("Gamepad stream stopped: {error}");
  }
}

#[cfg(mobile)]
#[command]
pub async fn gamepad_vibrate<R: Runtime>(
  app: AppHandle<R>,
  index: u32,
  low_freq: f32,
  high_freq: f32,
  duration_ms: u32,
) {
  use tauri_plugin_manafish_mobile::{GamepadVibration, MobileExt};

  let vibration = GamepadVibration {
    index,
    low_freq,
    high_freq,
    duration_ms,
  };
  if let Err(error) = app.mobile().vibrate_gamepad(vibration).await {
    crate::log_warn!("Failed to vibrate gamepad {index}: {error}");
  }
}
