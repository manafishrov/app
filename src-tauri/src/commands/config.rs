use crate::config::{get_config_from_file, set_config_to_file, ConfigSendChannelState};
use crate::models::config::Config;
use tauri::{command, State};

#[command]
pub fn get_config() -> Config {
  get_config_from_file()
}

#[command]
pub async fn set_config(
  state: State<'_, ConfigSendChannelState>,
  payload: Config,
) -> Result<(), String> {
  set_config_to_file(&state, payload).await
}
