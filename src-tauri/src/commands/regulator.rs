use crate::models::regulator::Regulator;
use crate::websocket::{
  client::MessageSendChannelState,
  send::regulator::{handle_get_regulator_config, handle_regulator, handle_regulator_auto_tuning},
};
use tauri::State;

#[tauri::command]
pub async fn regulator(
  state: State<'_, MessageSendChannelState>,
  payload: Regulator,
) -> Result<(), String> {
  handle_regulator(&state, payload).await;
  Ok(())
}

#[tauri::command]
pub async fn get_regulator_config(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_get_regulator_config(&state).await;
  Ok(())
}

#[tauri::command]
pub async fn regulator_auto_tuning(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_regulator_auto_tuning(&state).await;
  Ok(())
}
