use crate::models::status::Status;
use crate::websocket_client;

#[tauri::command]
pub async fn get_status() -> Result<Status, String> {
  Ok(websocket_client::get_current_status())
}
