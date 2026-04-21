use tauri::{AppHandle, Manager, State, command};

use crate::config::{ConfigSendChannelState, get_config_from_file, set_config_to_file};
use crate::models::config::Config;

#[command]
#[allow(clippy::needless_pass_by_value)]
/// # Errors
/// Returns an error if the splashscreen or main window cannot be found or controlled.
pub fn close_splashscreen(app: AppHandle) -> Result<(), String> {
  let splashscreen = app
    .get_webview_window("splashscreen")
    .ok_or_else(|| "Splashscreen window not found".to_string())?;
  splashscreen.close().map_err(|error| error.to_string())?;

  let main_window = app
    .get_webview_window("main")
    .ok_or_else(|| "Main window not found".to_string())?;
  main_window.show().map_err(|error| error.to_string())?;

  Ok(())
}

#[command]
pub fn get_config() -> Config {
  get_config_from_file()
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
