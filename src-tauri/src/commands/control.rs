use crate::ControlChannelState;
use tauri::State;

#[tauri::command]
pub async fn send_control_input(
  state: State<'_, ControlChannelState>,
  input: [f32; 6],
) -> Result<(), String> {
  if let Err(e) = state.tx.send(input).await {
    eprintln!("Failed to send control input: {}", e);
    Err(format!("Failed to send control input: {}", e))
  } else {
    Ok(())
  }
}
