use tauri::{State, command};

use crate::config::{ConfigSendChannelState, get_config_from_file, set_config_to_file};
use crate::models::config::Config;

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
