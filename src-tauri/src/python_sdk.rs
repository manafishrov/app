//! Cache the connected firmware's real Python sources for local static analysis.
use std::collections::BTreeMap;
use std::fmt::Write as _;
use std::io::Read;
use std::path::{Component, Path, PathBuf};

use base64::Engine;
use serde::Deserialize;
use serde_json::json;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Manager};

use crate::websocket::capabilities::request;

const MAX_ARCHIVE: usize = 16 * 1024 * 1024;
const MAX_SOURCE: u64 = 64 * 1024 * 1024;

#[derive(Deserialize)]
struct Description {
  revision: String,
  size: usize,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct Chunk {
  data: String,
  next_offset: usize,
  eof: bool,
}

/// # Errors
/// Returns a filesystem error if the analysis workspace cannot be prepared.
pub async fn workspace(app: &AppHandle) -> Result<(PathBuf, String), String> {
  let root = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("python-editor");
  tokio::fs::create_dir_all(&root).await.map_err(|e| e.to_string())?;
  let available = match refresh(app, &root).await {
    Ok(()) => "current".to_string(),
    Err(error) => {
      crate::log_warn!("Python editor SDK synchronization: {error}");
      if root.join("sdk/revision").is_file() {
        "cached".to_string()
      } else {
        "missing".to_string()
      }
    },
  };
  tokio::fs::write(root.join("ty.toml"), "[environment]\npython-version = \"3.13\"\npython-platform = \"linux\"\nextra-paths = [\"sdk\"]\n").await.map_err(|e| e.to_string())?;
  Ok((root, available))
}

/// # Errors
/// Returns transport, checksum, quota, or filesystem errors.
async fn refresh(app: &AppHandle, root: &Path) -> Result<(), String> {
  let description: Description =
    serde_json::from_value(request(app, "sdk.describe", json!({})).await?)
      .map_err(|e| e.to_string())?;
  if description.size == 0
    || description.size > MAX_ARCHIVE
    || description.revision.len() != 64
    || !description.revision.bytes().all(|b| b.is_ascii_hexdigit())
  {
    return Err("Invalid SDK source snapshot".into());
  }
  if tokio::fs::read_to_string(root.join("sdk/revision")).await.ok().as_deref()
    == Some(&description.revision)
  {
    return Ok(());
  }
  let mut bytes = Vec::with_capacity(description.size);
  while bytes.len() < description.size {
    let chunk: Chunk = serde_json::from_value(
      request(
        app,
        "sdk.read",
        json!({"revision": description.revision, "offset": bytes.len()}),
      )
      .await?,
    )
    .map_err(|e| e.to_string())?;
    if chunk.data.len() > 87_384 {
      return Err("Oversized SDK source chunk".into());
    }
    let data = base64::engine::general_purpose::STANDARD
      .decode(chunk.data)
      .map_err(|e| e.to_string())?;
    if data.is_empty()
      || data.len() > 65_536
      || chunk.next_offset != bytes.len() + data.len()
      || chunk.next_offset > description.size
      || chunk.eof != (chunk.next_offset == description.size)
    {
      return Err("Invalid SDK source chunk offset".into());
    }
    bytes.extend(data);
  }
  if Sha256::digest(&bytes).iter().fold(String::new(), |mut output, byte| {
    let _ = write!(output, "{byte:02x}");
    output
  }) != description.revision
  {
    return Err("SDK source checksum mismatch".into());
  }
  let root = root.to_owned();
  tauri::async_runtime::spawn_blocking(move || install(&root, &bytes, &description.revision))
    .await
    .map_err(|e| e.to_string())?
}

fn safe_source_path(name: &str) -> bool {
  !name.contains('\\')
    && !name.contains(':')
    && name.split('/').all(|part| !part.is_empty() && !part.starts_with('.'))
    && Path::new(name).components().all(|part| matches!(part, Component::Normal(_)))
    && matches!(Path::new(name).extension().and_then(|s| s.to_str()), Some("py" | "pyi"))
}

/// # Errors
/// Rejects invalid sources and returns cache filesystem errors.
fn install(root: &Path, archive: &[u8], revision: &str) -> Result<(), String> {
  let mut raw = Vec::new();
  flate2::read::GzDecoder::new(archive)
    .take(MAX_SOURCE + 1)
    .read_to_end(&mut raw)
    .map_err(|e| e.to_string())?;
  if raw.len() as u64 > MAX_SOURCE {
    return Err("SDK definitions exceed 64 MiB".into());
  }
  let files: BTreeMap<String, String> = serde_json::from_slice(&raw).map_err(|e| e.to_string())?;
  if files.len() > 20_000
    || !files.contains_key("manafish_sdk/__init__.py")
    || files.keys().any(|path| !safe_source_path(path))
  {
    return Err("Invalid SDK source paths".into());
  }
  let temporary = tempfile::tempdir_in(root).map_err(|e| e.to_string())?;
  for (name, text) in files {
    let path = temporary.path().join(name);
    if let Some(parent) = path.parent() {
      std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(path, text).map_err(|e| e.to_string())?;
  }
  std::fs::write(temporary.path().join("revision"), revision).map_err(|e| e.to_string())?;
  let destination = root.join("sdk");
  let backup = root.join("sdk-previous");
  if backup.exists() {
    std::fs::remove_dir_all(&backup).map_err(|e| e.to_string())?;
  }
  if destination.exists() {
    std::fs::rename(&destination, &backup).map_err(|e| e.to_string())?;
  }
  if let Err(error) = std::fs::rename(temporary.path(), &destination) {
    if backup.exists() {
      let _ = std::fs::rename(&backup, &destination);
    }
    return Err(error.to_string());
  }
  if backup.exists() {
    std::fs::remove_dir_all(backup).map_err(|e| e.to_string())?;
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  // Assertions and propagated fixture errors are the purpose of these tests.
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;
  #[test]
  fn sources_cannot_escape_the_analysis_directory() {
    for path in [
      "/tmp/x.py", "../x.py", "a/../x.py", "a\\x.py", "C:/x.py", "x.py:stream", ".env", "a//x.py",
    ] {
      assert!(!safe_source_path(path), "{path}");
    }
    assert!(safe_source_path("rov_firmware/models/sensors.py"));
    assert!(safe_source_path("numpy/__init__.pyi"));
  }
  fn archive(files: &serde_json::Value) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    use std::io::Write;
    let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::fast());
    encoder.write_all(&serde_json::to_vec(files)?)?;
    Ok(encoder.finish()?)
  }

  #[test]
  fn invalid_updates_preserve_the_previous_sdk() -> Result<(), Box<dyn std::error::Error>> {
    let root = tempfile::tempdir()?;
    let original = json!({"manafish_sdk/__init__.py": "# original", "rov_firmware/rov_state.py": "class RovState: pass"});
    install(root.path(), &archive(&original)?, "original")?;
    let invalid = json!({"manafish_sdk/__init__.py": "# replacement", "../outside.py": "bad"});
    assert!(install(root.path(), &archive(&invalid)?, "invalid").is_err());
    assert!(install(root.path(), b"truncated archive", "invalid").is_err());
    assert_eq!(std::fs::read_to_string(root.path().join("sdk/revision"))?, "original");
    assert_eq!(
      std::fs::read_to_string(root.path().join("sdk/manafish_sdk/__init__.py"))?,
      "# original"
    );
    assert!(!root.path().join("outside.py").exists());
    let updated = json!({"manafish_sdk/__init__.py": "# new source"});
    install(root.path(), &archive(&updated)?, "updated")?;
    assert_eq!(std::fs::read_to_string(root.path().join("sdk/revision"))?, "updated");
    assert!(!root.path().join("sdk/rov_firmware/rov_state.py").exists());
    Ok(())
  }
}
