use crate::models::debug::{Debug, LogType};
use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

pub fn debug_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

pub fn debug_log(message: &str) {
  if let Some(handle) = APP_HANDLE.get() {
    let _ = handle.emit(
      "debug_backend",
      Debug {
        log_type: LogType::Log,
        message: message.to_string(),
      },
    );
  } else {
    println!("DEBUG: {}", message);
  }
}

pub fn debug_error(message: &str) {
  if let Some(handle) = APP_HANDLE.get() {
    let _ = handle.emit(
      "debug_backend",
      Debug {
        log_type: LogType::Error,
        message: message.to_string(),
      },
    );
  } else {
    println!("DEBUG: {}", message);
  }
}
