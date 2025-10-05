use crate::log_error;
use crate::models::toast::{ToastCancel, Toast, ToastType};
use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

pub fn toast_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

#[allow(dead_code)]
pub fn toast(
  id: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(id, None, message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_success(
  id: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(id, Some(ToastType::Success), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_info(
  id: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(id, Some(ToastType::Info), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_warn(
  id: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(id, Some(ToastType::Warn), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_error(
  id: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(id, Some(ToastType::Error), message, description, cancel);
}

#[allow(dead_code)]
pub fn toast_loading(
  id: Option<String>,
  message: String,
  description: Option<String>,
  cancel: Option<ToastCancel>,
) {
  toast_message(id, Some(ToastType::Loading), message, description, cancel);
}

fn toast_message(
  id: Option<String>,
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
          id,
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
