use std::collections::HashMap;

use serde_json::Value;
use tauri::AppHandle;
use tauri_plugin_updater::{Result, UpdaterExt};

use crate::models::toast::ToastContent;
use crate::toast::{toast_info, toast_loading};

fn to_progress_percent(downloaded: usize, total: u64) -> u64 {
  if total == 0 {
    return 0;
  }
  let percent = u64::try_from(downloaded).unwrap_or(u64::MAX).saturating_mul(100);
  (percent / total).min(100)
}

/// # Errors
/// Returns an error if checking for, downloading, or installing an update
/// fails.
pub async fn update_app(app: AppHandle) -> Result<()> {
  if let Some(update) = app.updater()?.check().await? {
    toast_info(
      None,
      ToastContent {
        message_key: "toasts_update_available".to_string(),
        message_args: None,
        description_key: Some("toasts_update_downloading".to_string()),
        description_args: None,
      },
      None,
    );
    let mut downloaded = 0;
    update
      .download_and_install(
        |chunk_length, content_length_opt| {
          let actual_content_length = content_length_opt.unwrap_or(0);
          downloaded += chunk_length;
          if actual_content_length > 0 {
            let progress_percent = to_progress_percent(downloaded, actual_content_length);
            let mut message_args = HashMap::<String, Value>::new();
            let _ = message_args.insert("percent".to_string(), Value::from(progress_percent));
            toast_loading(
              Some("update-progress".to_string()),
              ToastContent {
                message_key: "toasts_update_downloading_progress".to_string(),
                message_args: Some(message_args),
                description_key: None,
                description_args: None,
              },
              None,
            );
          }
        },
        || {
          toast_info(
            Some("update-progress".to_string()),
            ToastContent {
              message_key: "toasts_update_downloaded".to_string(),
              message_args: None,
              description_key: Some("toasts_update_installing".to_string()),
              description_args: None,
            },
            None,
          );
        },
      )
      .await?;
    toast_info(
      Some("update-progress".to_string()),
      ToastContent {
        message_key: "toasts_update_ready".to_string(),
        message_args: None,
        description_key: Some("toasts_update_restart_to_apply".to_string()),
        description_args: None,
      },
      None,
    );
  }

  Ok(())
}
