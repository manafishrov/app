use crate::websocket_client::WebSocketClient;
use std::sync::Arc;
use tokio::sync::Mutex;

#[tauri::command]
pub fn get_connection_status(
  ws_client: tauri::State<'_, Arc<Mutex<Option<WebSocketClient>>>>,
) -> Result<bool, String> {
  let rt = tokio::runtime::Handle::current();
  let status = rt.block_on(async {
    if let Some(client) = ws_client.lock().await.as_ref() {
      client.is_connected()
    } else {
      false
    }
  });
  Ok(status)
}
