use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

use crate::log_error;
use crate::models::toast::{Toast, ToastCancel, ToastType};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

pub fn toast_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

#[allow(dead_code)]
pub fn toast(
  identifier: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(identifier, None, message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_success(
  identifier: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(identifier, Some(ToastType::Success), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_info(
  identifier: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(identifier, Some(ToastType::Info), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_warn(
  identifier: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(identifier, Some(ToastType::Warn), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_error(
  identifier: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(identifier, Some(ToastType::Error), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_loading(
  identifier: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(identifier, Some(ToastType::Loading), message, description, cancel);
}

fn toast_message(
  identifier: Option<String>,
  toast_type: Option<ToastType>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  if let Some(handle) = APP_HANDLE.get() {
    handle
      .emit(
        "show_toast",
        Toast {
          identifier,
          toast_type,
          message,
          description,
          cancel,
        },
      )
      .unwrap();
  } else {
    log_error!("Toast system not initialized. Cannot send toast message.");
  }
}
