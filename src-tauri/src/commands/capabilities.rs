use std::io::{Read, Write};
use std::path::Path;

use base64::Engine;
use serde::Deserialize;
use serde_json::{Value, json};
use tauri::{AppHandle, command};
use tauri_plugin_dialog::DialogExt;

use crate::websocket::capabilities::request;

const MAX_SOURCE_BYTES: u64 = 262_144;
const MAX_CHUNK_BYTES: usize = 65_536;

#[command]
/// # Errors
/// Returns the ROV's validation or execution error, or a transport error.
pub async fn request_capability(
  app: AppHandle,
  operation: String,
  params: Value,
) -> Result<Value, String> {
  request(&app, &operation, params).await
}

/// # Errors
/// Returns an error for a non-Python, oversized, unreadable, or non-UTF-8 file.
fn read_source(path: &Path) -> Result<String, String> {
  if path.extension().and_then(std::ffi::OsStr::to_str) != Some("py") {
    return Err("Choose a Python extension file ending in .py".into());
  }
  let file = std::fs::File::open(path).map_err(|error| error.to_string())?;
  let mut contents = Vec::new();
  file
    .take(MAX_SOURCE_BYTES + 1)
    .read_to_end(&mut contents)
    .map_err(|error| error.to_string())?;
  if contents.len() as u64 > MAX_SOURCE_BYTES {
    return Err("Extension source must be at most 256 KiB".into());
  }
  String::from_utf8(contents).map_err(|_| "Extension source must use UTF-8 encoding".into())
}

#[command]
/// # Errors
/// Returns an error if the selected source cannot be read. Cancellation returns null.
pub async fn import_extension_source(app: AppHandle) -> Result<Option<String>, String> {
  tauri::async_runtime::spawn_blocking(move || {
    app
      .dialog()
      .file()
      .add_filter("Python", &["py"])
      .blocking_pick_file()
      .map(|file| {
        file
          .into_path()
          .map_err(|error| error.to_string())
          .and_then(|path| read_source(&path))
      })
      .transpose()
  })
  .await
  .map_err(|error| error.to_string())?
}

#[derive(Deserialize)]
struct CsvSnapshot {
  token: String,
  size: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CsvChunk {
  data: String,
  next_offset: u64,
  eof: bool,
}

/// # Errors
/// Returns an error if the chunk is oversized, malformed, or inconsistent with the snapshot.
fn decode_chunk(chunk: &CsvChunk, offset: u64, size: u64) -> Result<Vec<u8>, String> {
  if chunk.data.len() > MAX_CHUNK_BYTES.div_ceil(3) * 4 {
    return Err("The ROV returned an oversized CSV chunk".into());
  }
  let bytes = base64::engine::general_purpose::STANDARD
    .decode(&chunk.data)
    .map_err(|error| format!("Invalid CSV data from the ROV: {error}"))?;
  let next = offset.checked_add(bytes.len() as u64).ok_or("CSV offset overflow")?;
  if bytes.len() > MAX_CHUNK_BYTES
    || next != chunk.next_offset
    || next > size
    || (chunk.eof != (next == size))
    || (bytes.is_empty() && !chunk.eof)
  {
    return Err("The ROV returned an inconsistent CSV chunk; download cancelled".into());
  }
  Ok(bytes)
}

/// # Errors
/// Returns network, snapshot consistency, and local file writing errors.
async fn write_snapshot(
  app: &AppHandle,
  snapshot: &CsvSnapshot,
  path: &Path,
) -> Result<(), String> {
  let parent = path.parent().ok_or("Invalid CSV destination")?;
  let mut file = tempfile::NamedTempFile::new_in(parent).map_err(|error| error.to_string())?;
  let mut offset = 0;
  loop {
    let response =
      request(app, "csv.read", json!({"token":snapshot.token,"offset":offset})).await?;
    let chunk: CsvChunk = serde_json::from_value(response).map_err(|error| error.to_string())?;
    let bytes = decode_chunk(&chunk, offset, snapshot.size)?;
    file.write_all(&bytes).map_err(|error| error.to_string())?;
    offset = chunk.next_offset;
    if chunk.eof {
      break;
    }
  }
  file.as_file().sync_all().map_err(|error| error.to_string())?;
  file.persist(path).map_err(|error| error.to_string())?;
  Ok(())
}

#[command]
/// # Errors
/// Returns snapshot, download, or filesystem errors. Cancellation leaves files unchanged.
pub async fn save_csv(app: AppHandle, name: String) -> Result<bool, String> {
  let dialog_app = app.clone();
  let filename = Path::new(&name)
    .file_name()
    .and_then(std::ffi::OsStr::to_str)
    .ok_or("Invalid CSV filename")?
    .to_string();
  let selected = tauri::async_runtime::spawn_blocking(move || {
    dialog_app
      .dialog()
      .file()
      .set_file_name(filename)
      .add_filter("CSV", &["csv"])
      .blocking_save_file()
  })
  .await
  .map_err(|error| error.to_string())?;
  let Some(selected) = selected else {
    return Ok(false);
  };
  let path = selected.into_path().map_err(|error| error.to_string())?;
  let result = request(&app, "csv.open", json!({"name":name})).await?;
  let snapshot: CsvSnapshot = serde_json::from_value(result).map_err(|error| error.to_string())?;
  let result = write_snapshot(&app, &snapshot, &path).await;
  let close = request(&app, "csv.close", json!({"token":snapshot.token})).await;
  if let Err(error) = close {
    crate::log_warn!("Failed to close CSV snapshot: {error}");
  }
  result.map(|()| true)
}

#[cfg(test)]
mod tests {
  // Assertions and propagated fixture errors are the purpose of these tests.
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;

  #[test]
  fn source_import_preserves_unicode_crlf_and_exact_bytes() -> Result<(), Box<dyn std::error::Error>>
  {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("example.py");
    let source = "# Water sensor λ\r\nname = '海'\r\n";
    std::fs::write(&path, source)?;
    assert_eq!(read_source(&path)?, source);
    Ok(())
  }

  #[test]
  fn source_rejects_non_utf8_and_non_python_files() -> Result<(), Box<dyn std::error::Error>> {
    let directory = tempfile::tempdir()?;
    let path = directory.path().join("example.py");
    std::fs::write(&path, [255])?;
    assert!(read_source(&path).is_err());
    assert!(read_source(&directory.path().join("example.txt")).is_err());
    Ok(())
  }

  #[test]
  fn csv_chunks_reject_truncation_and_accept_empty_files() {
    let valid = CsvChunk {
      data: "YSxiCg==".into(),
      next_offset: 4,
      eof: true,
    };
    assert_eq!(decode_chunk(&valid, 0, 4), Ok(b"a,b\n".to_vec()));
    assert!(decode_chunk(&valid, 0, 5).is_err());
    assert!(decode_chunk(&valid, 1, 4).is_err());
    let empty = CsvChunk {
      data: String::new(),
      next_offset: 0,
      eof: true,
    };
    assert_eq!(decode_chunk(&empty, 0, 0), Ok(Vec::new()));
  }
}
