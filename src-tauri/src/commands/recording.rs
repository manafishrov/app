use tauri::command;

#[command]
/// # Errors
/// Returns an error if FFmpeg cannot convert the temporary recording into an
/// MP4 file.
pub async fn save_recording(temp_path: String) -> Result<(), String> {
  crate::recording::convert(temp_path).await
}

#[command]
/// # Errors
/// Returns an error if the temporary file cannot be opened or written.
pub async fn append_recording_chunk(temp_path: String, chunk: Vec<u8>) -> Result<(), String> {
  crate::recording::append_chunk(temp_path, chunk).await
}
