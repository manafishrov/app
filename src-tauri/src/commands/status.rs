#[tauri::command]
pub async fn get_connection_status() -> Result<bool, String> {
  Ok(true)
}

#[tauri::command]
pub async fn get_water_sensor_status() -> Result<bool, String> {
  Ok(false)
}
