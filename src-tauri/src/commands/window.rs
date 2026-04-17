use tauri::{AppHandle, Manager, command};

#[command]
pub fn close_splashscreen(app: AppHandle) -> Result<(), String> {
  let splashscreen = app
    .get_webview_window("splashscreen")
    .ok_or_else(|| "Splashscreen window not found".to_string())?;
  splashscreen.close().map_err(|e| e.to_string())?;

  let main_window = app
    .get_webview_window("main")
    .ok_or_else(|| "Main window not found".to_string())?;
  main_window.show().map_err(|e| e.to_string())?;

  Ok(())
}
