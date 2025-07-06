use crate::models::toast::{Toast, ToastType};
use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

pub fn toast_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

pub fn toast(id: Option<String>, message: String, description: Option<String>) {
  toast_message(id, None, message, description, None);
}

pub fn toast_success(id: Option<String>, message: String, description: Option<String>) {
  toast_message(id, Some(ToastType::Success), message, description, None);
}

pub fn toast_info(id: Option<String>, message: String, description: Option<String>) {
  toast_message(id, Some(ToastType::Info), message, description, None);
}

pub fn toast_warn(id: Option<String>, message: String, description: Option<String>) {
  toast_message(id, Some(ToastType::Warn), message, description, None);
}

pub fn toast_error(id: Option<String>, message: String, description: Option<String>) {
  toast_message(id, Some(ToastType::Error), message, description, None);
}

pub fn toast_loading(id: Option<String>, message: String, description: Option<String>) {
  toast_message(id, Some(ToastType::Loading), message, description, None);
}

pub fn toast_message(
  id: Option<String>,
  toast_type: Option<ToastType>,
  message: String,
  description: Option<String>,
  cancel_command: Option<String>,
) {
  if let Some(handle) = APP_HANDLE.get() {
    handle
      .emit(
        "toast",
        Toast {
          id,
          toast_type,
          message,
          description,
          cancel_command,
        },
      )
      .unwrap();
  } else {
    eprintln!("ERROR: {}", message);
  }
}
