use tauri::command;
use tauri::ipc::{InvokeBody, Request};

#[command]
/// # Errors
/// Returns an error if FFmpeg cannot convert the temporary recording into an
/// MP4 file.
pub async fn save_recording(temp_path: String) -> Result<(), String> {
  crate::recording::convert(temp_path).await
}

#[command]
/// Appends a recording chunk sent as a raw binary IPC body, with the temp file
/// path in the `temp-path` header. Using the raw body avoids serializing the
/// video bytes as a JSON number array.
///
/// # Errors
/// Returns an error if the request body is not raw bytes, the `temp-path`
/// header is missing or invalid, or the file cannot be opened or written.
pub async fn append_recording_chunk(request: Request<'_>) -> Result<(), String> {
  let InvokeBody::Raw(chunk) = request.body() else {
    return Err("Recording chunk body must be raw bytes".to_string());
  };
  let encoded = request
    .headers()
    .get("temp-path")
    .ok_or_else(|| "Missing temp-path header".to_string())?
    .to_str()
    .map_err(|_| "Invalid temp-path header".to_string())?;
  let temp_path = percent_encoding::percent_decode_str(encoded)
    .decode_utf8()
    .map_err(|_| "Invalid temp-path encoding".to_string())?
    .into_owned();
  crate::recording::append_chunk(temp_path, chunk.clone()).await
}
