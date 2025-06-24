use crate::ControlChannelState;
use tauri::State;

#[tauri::command]
pub async fn send_movement_command(
  state: State<'_, ControlChannelState>,
  input: [f32; 6],
) -> Result<(), String> {
  if let Err(e) = state.tx.send(input).await {
    eprintln!("Failed to send movement command: {}", e);
    Err(format!("Failed to send movement command: {}", e))
  } else {
    Ok(())
  }
}
