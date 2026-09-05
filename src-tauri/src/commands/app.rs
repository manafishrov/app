use tauri::{AppHandle, Manager, State, command};
use tauri_plugin_dialog::DialogExt;

use crate::config::{
  ConfigSendChannelState, get_config_from_file, set_config_to_file, stage_config_to_file,
};
use crate::models::config::Config;
use crate::models::log::LogEntry;

#[command]
#[allow(clippy::needless_pass_by_value)]
/// # Errors
/// Returns an error if the main window cannot be found or controlled.
pub fn close_splashscreen(app: AppHandle) -> Result<(), String> {
  let main_window = app
    .get_webview_window("main")
    .ok_or_else(|| "Main window not found".to_string())?;
  main_window.show().map_err(|error| error.to_string())?;

  if let Some(splashscreen) = app.get_webview_window("splashscreen") {
    splashscreen.close().map_err(|error| error.to_string())?;
  }

  Ok(())
}

/// # Errors
/// Returns an error if writing the selected file fails.
fn write_log_export(path: Option<&std::path::Path>, contents: &str) -> Result<bool, String> {
  let Some(path) = path else {
    return Ok(false);
  };
  std::fs::write(path, contents).map_err(|error| error.to_string())?;
  Ok(true)
}

#[command]
/// # Errors
/// Returns an error if the selected file cannot be written or the save task fails.
pub async fn export_logs(app: AppHandle, contents: String, title: String) -> Result<bool, String> {
  tauri::async_runtime::spawn_blocking(move || {
    let selected = app
      .dialog()
      .file()
      .set_title(title)
      .set_file_name("manafish-logs.jsonl")
      .add_filter("JSON Lines", &["jsonl"])
      .blocking_save_file();
    let path = selected
      .map(|file| file.into_path().map_err(|error| error.to_string()))
      .transpose()?;
    write_log_export(path.as_deref(), &contents)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[command]
pub fn get_config() -> Config {
  get_config_from_file()
}

#[command]
pub fn initialize_log_listener() -> Vec<LogEntry> {
  crate::log::initialize_log_listener()
}

#[command]
/// # Errors
/// Returns an error if saving the config file fails or notifying the websocket
/// client task fails.
pub async fn set_config(
  state: State<'_, ConfigSendChannelState>,
  payload: Config,
) -> Result<(), String> {
  set_config_to_file(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if staging the config file fails.
pub fn stage_config(payload: Config) -> Result<(), String> {
  stage_config_to_file(payload)
}

#[cfg(test)]
mod tests {
  use super::write_log_export;

  #[test]
  fn cancelled_export_is_not_an_error() {
    assert_eq!(write_log_export(None, "unused"), Ok(false));
  }

  #[test]
  fn export_preserves_bytes_and_replaces_existing_contents()
  -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("logs.jsonl");
    std::fs::write(&path, "old contents that must not remain")?;
    let contents = "{\"message\":\"line one\\nline two λ\"}\n";
    assert_eq!(write_log_export(Some(&path), contents), Ok(true));
    assert_eq!(std::fs::read_to_string(path)?, contents);
    Ok(())
  }

  #[test]
  fn export_reports_write_failure() -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    assert!(write_log_export(Some(directory.path()), "contents").is_err());
    Ok(())
  }
}
