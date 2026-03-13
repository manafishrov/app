use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

use crate::models::log::{LogEntry, LogLevel, LogOrigin};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

fn emit_log(level: LogLevel, message: &str) {
  if let Some(handle) = APP_HANDLE.get() {
    if let Err(error) = handle.emit(
      "log_message",
      LogEntry {
        origin: LogOrigin::Backend,
        level,
        message: message.to_string(),
      },
    ) {
      eprintln!("Failed to emit backend log message: {error}");
      eprintln!("{message}");
    }
  } else {
    match level {
      LogLevel::Info => println!("INFO: {message}"),
      LogLevel::Warn => println!("WARN: {message}"),
      LogLevel::Error => eprintln!("ERROR: {message}"),
    }
  }
}

pub fn log_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

#[allow(dead_code)]
pub fn log_info(message: &str) {
  emit_log(LogLevel::Info, message);
}

#[allow(dead_code)]
pub fn log_warn(message: &str) {
  emit_log(LogLevel::Warn, message);
}

#[allow(dead_code)]
pub fn log_error(message: &str) {
  emit_log(LogLevel::Error, message);
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
