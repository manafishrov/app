use crate::websocket_client::{CONNECTION_STATUS, WATER_SENSOR_STATUS};
use std::sync::atomic::Ordering;

#[tauri::command]
pub async fn get_connection_status() -> Result<bool, String> {
  Ok(CONNECTION_STATUS.load(Ordering::Relaxed))
}

#[tauri::command]
pub async fn get_water_sensor_status() -> Result<bool, String> {
  Ok(WATER_SENSOR_STATUS.load(Ordering::Relaxed))
}
