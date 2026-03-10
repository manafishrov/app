use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

use crate::log_error;
use crate::models::toast::{Toast, ToastAction, ToastContent, ToastVariant};

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();

pub fn toast_init(app_handle: AppHandle) {
  if APP_HANDLE.get().is_none() {
    let _ = APP_HANDLE.set(app_handle);
  }
}

#[allow(dead_code)]
pub fn toast(
  identifier: Option<String>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  toast_message(identifier, None, content, action);
}

#[allow(dead_code)]
pub fn toast_success(
  identifier: Option<String>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  toast_message(identifier, Some(ToastVariant::Success), content, action);
}

#[allow(dead_code)]
pub fn toast_info(
  identifier: Option<String>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  toast_message(identifier, Some(ToastVariant::Info), content, action);
}

#[allow(dead_code)]
pub fn toast_warn(
  identifier: Option<String>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  toast_message(identifier, Some(ToastVariant::Warn), content, action);
}

#[allow(dead_code)]
pub fn toast_error(
  identifier: Option<String>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  toast_message(identifier, Some(ToastVariant::Error), content, action);
}

#[allow(dead_code)]
pub fn toast_loading(
  identifier: Option<String>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  toast_message(identifier, Some(ToastVariant::Loading), content, action);
}

fn toast_message(
  identifier: Option<String>,
  variant: Option<ToastVariant>,
  content: ToastContent,
  action: Option<ToastAction>,
) {
  if let Some(handle) = APP_HANDLE.get() {
    handle
      .emit(
        "show_toast",
        Toast {
          identifier,
          variant,
          content,
          action,
        },
      )
      .unwrap();
  } else {
    log_error!("Toast system not initialized. Cannot send toast message.");
  }
}
