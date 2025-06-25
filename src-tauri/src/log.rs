use crate::models::log::{Log, LogLevel};
use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

pub fn log_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

pub fn log_info(message: &str) {
  if let Some(handle) = APP_HANDLE.get() {
    handle
      .emit(
        "log_backend",
        Log {
          log_level: LogLevel::Info,
          message: message.to_string(),
        },
      )
      .unwrap();
  } else {
    println!("INFO: {}", message);
  }
}

pub fn log_warn(message: &str) {
  if let Some(handle) = APP_HANDLE.get() {
    handle
      .emit(
        "log_backend",
        Log {
          log_level: LogLevel::Warn,
          message: message.to_string(),
        },
      )
      .unwrap();
  } else {
    println!("WARN: {}", message);
  }
}

pub fn log_error(message: &str) {
  if let Some(handle) = APP_HANDLE.get() {
    handle
      .emit(
        "log_backend",
        Log {
          log_level: LogLevel::Error,
          message: message.to_string(),
        },
      )
      .unwrap();
  } else {
    eprintln!("ERROR: {}", message);
  }
}

#[macro_export]
macro_rules! log_info {
  ($($arg:tt)*) => ($crate::log::log_info(&format!($($arg)*)));
}

#[macro_export]
macro_rules! log_warn {
  ($($arg:tt)*) => ($crate::log::log_warn(&format!($($arg)*)));
}

#[macro_export]
macro_rules! log_error {
  ($($arg:tt)*) => ($crate::log::log_error(&format!($($arg)*)));
}
