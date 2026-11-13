use tauri::{AppHandle, command};

#[command]
/// Looks for the photo just taken now instead of at the next idle poll; the
/// background receiver downloads it into the photo folder.
pub async fn receive_photos(app: AppHandle) {
  crate::photos::wake(&app);
}

#[cfg(mobile)]
#[command]
/// Display name of a stored photo folder; empty is the platform default.
///
/// # Errors
/// Returns an error if the folder can no longer be accessed.
pub async fn describe_photo_directory(app: AppHandle, directory: String) -> Result<String, String> {
  use tauri_plugin_manafish_mobile::MobileExt;

  app.mobile().describe_directory(&directory, "photo").await
}
