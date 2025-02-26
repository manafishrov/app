use crate::websocket_client::WebSocketClient;
use std::sync::Arc;
use tokio::sync::Mutex;

#[tauri::command]
pub async fn get_connection_status(
  ws_client: tauri::State<'_, Arc<Mutex<Option<WebSocketClient>>>>,
) -> Result<bool, String> {
  if let Some(client) = ws_client.lock().await.as_ref() {
    Ok(client.is_connected())
  } else {
    Ok(false)
  }
}
