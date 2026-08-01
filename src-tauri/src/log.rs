use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, OnceLock};
use tauri::{AppHandle, Emitter};

use crate::models::log::{LogEntry, LogLevel, LogOrigin};

static APP_HANDLE: OnceLock<AppHandle> = OnceLock::new();
static LOG_LISTENER_READY: AtomicBool = AtomicBool::new(false);
static PENDING_STARTUP_LOGS: OnceLock<Mutex<Vec<LogEntry>>> = OnceLock::new();

fn emit_log_entry(entry: &LogEntry) {
  if let Some(handle) = APP_HANDLE.get() {
    if let Err(error) = handle.emit("log_message", entry) {
      eprintln!("Failed to emit backend log message: {error}");
      eprintln!("{}", entry.message);
    }
  } else {
    match entry.level {
      LogLevel::Info => println!("INFO: {}", entry.message),
      LogLevel::Warn => println!("WARN: {}", entry.message),
      LogLevel::Error => eprintln!("ERROR: {}", entry.message),
    }
  }
}

fn emit_log(level: LogLevel, message: &str) {
  emit_log_entry(&LogEntry {
    origin: LogOrigin::Backend,
    level,
    message: message.to_string(),
  });
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

pub fn log_startup_diagnostic(message: &str) {
  let entry = LogEntry {
    origin: LogOrigin::Backend,
    level: LogLevel::Warn,
    message: message.to_string(),
  };
  if LOG_LISTENER_READY.load(Ordering::Acquire) {
    emit_log_entry(&entry);
    return;
  }

  let pending = PENDING_STARTUP_LOGS.get_or_init(|| Mutex::new(Vec::new()));
  if let Ok(mut entries) = pending.lock() {
    if LOG_LISTENER_READY.load(Ordering::Acquire) {
      drop(entries);
      emit_log_entry(&entry);
    } else {
      entries.push(entry);
    }
  } else {
    eprintln!("Unable to buffer startup diagnostic: {message}");
  }
}

pub fn initialize_log_listener() -> Vec<LogEntry> {
  let pending = PENDING_STARTUP_LOGS.get_or_init(|| Mutex::new(Vec::new()));
  if let Ok(mut entries) = pending.lock() {
    LOG_LISTENER_READY.store(true, Ordering::Release);
    std::mem::take(&mut *entries)
  } else {
    LOG_LISTENER_READY.store(true, Ordering::Release);
    Vec::new()
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

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn startup_diagnostics_are_buffered_until_the_main_log_listener_is_ready() {
    log_startup_diagnostic("buffered startup diagnostic");

    let entries = initialize_log_listener();

    assert!(entries.iter().any(|entry| {
      matches!(entry.level, LogLevel::Warn)
        && matches!(entry.origin, LogOrigin::Backend)
        && entry.message == "buffered startup diagnostic"
    }));
  }
}
