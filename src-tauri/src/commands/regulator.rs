use crate::models::regulator::{MovementCoefficients, Regulator};
use crate::websocket::{
  client::MessageSendChannelState,
  send::regulator::{
    handle_get_regulator_config, handle_movement_coefficients, handle_regulator,
    handle_regulator_auto_tuning,
  },
};
use tauri::{command, State};

#[command]
pub async fn regulator(
  state: State<'_, MessageSendChannelState>,
  payload: Regulator,
) -> Result<(), String> {
  handle_regulator(&state, payload).await;
  Ok(())
}

#[command]
pub async fn movement_coefficients(
  state: State<'_, MessageSendChannelState>,
  payload: MovementCoefficients,
) -> Result<(), String> {
  handle_movement_coefficients(&state, payload).await;
  Ok(())
}

#[command]
pub async fn get_regulator_config(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_get_regulator_config(&state).await;
  Ok(())
}

#[command]
pub async fn regulator_auto_tuning(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_regulator_auto_tuning(&state).await;
  Ok(())
}
