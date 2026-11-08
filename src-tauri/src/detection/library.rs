//! The user's imported detection models, stored in the app data directory.
//!
//! Each model is `<id>.onnx` plus `<id>.json` holding what was read from it at
//! import time, so listing models does not have to load them. The ID is the
//! start of the file's SHA-256, so importing the same file twice is a no-op.

use std::fmt::Write as _;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tokio_util::sync::CancellationToken;

use super::model::{DetectionModel, ExecutionProviderPreference, ModelDescription};

const ID_LENGTH: usize = 16;
static MUTATIONS: Mutex<()> = Mutex::new(());

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DetectionModelInfo {
  pub id: String,
  pub name: String,
  pub file_size: u64,
  /// Milliseconds since the Unix epoch.
  pub imported_at: u64,
  #[serde(flatten)]
  pub description: ModelDescription,
}

#[cfg(mobile)]
static MOBILE_MODELS_DIR: std::sync::OnceLock<PathBuf> = std::sync::OnceLock::new();

#[cfg(mobile)]
pub fn init_models_dir(app: &tauri::AppHandle) {
  use tauri::Manager;
  if let Ok(directory) = app.path().app_data_dir() {
    let _ = MOBILE_MODELS_DIR.set(directory.join("detection-models"));
  }
}

/// # Errors
/// Returns an error if the platform has no data directory.
pub(super) fn models_dir() -> Result<PathBuf, String> {
  #[cfg(mobile)]
  return MOBILE_MODELS_DIR
    .get()
    .cloned()
    .ok_or_else(|| "Model storage is not initialized".to_string());
  #[cfg(desktop)]
  dirs::data_dir()
    .map(|base| base.join("manafish").join("detection-models"))
    .ok_or_else(|| "Could not find the app data directory".to_string())
}

/// # Errors
/// Rejects anything but a hex ID, so an ID can never escape the directory.
fn validate_id(id: &str) -> Result<(), String> {
  if id.len() == ID_LENGTH && id.chars().all(|c| c.is_ascii_hexdigit()) {
    Ok(())
  } else {
    Err(format!("Invalid model ID \"{id}\""))
  }
}

/// # Errors
/// Returns an error if the ID is malformed or the model is not installed.
pub fn model_path(id: &str) -> Result<PathBuf, String> {
  validate_id(id)?;
  let path = models_dir()?.join(format!("{id}.onnx"));
  if path.is_file() {
    Ok(path)
  } else {
    Err("The selected model is no longer installed".to_string())
  }
}

/// # Errors
/// Returns an error if the models directory exists but cannot be read.
pub fn list() -> Result<Vec<DetectionModelInfo>, String> {
  let dir = models_dir()?;
  let entries = match fs::read_dir(&dir) {
    Ok(entries) => entries,
    Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(Vec::new()),
    Err(error) => return Err(format!("Could not read {}: {error}", dir.display())),
  };
  let mut models: Vec<DetectionModelInfo> = entries
    .flatten()
    .map(|entry| entry.path())
    .filter(|path| path.extension().is_some_and(|extension| extension == "json"))
    .filter(|path| path.with_extension("onnx").is_file())
    .filter_map(|path| fs::read_to_string(path).ok())
    .filter_map(|raw| serde_json::from_str(&raw).ok())
    .collect();
  models.sort_by_key(|model| model.name.to_lowercase());
  Ok(models)
}

/// # Errors
/// Returns an error if the file cannot be read.
fn hash_file(path: &Path) -> Result<String, String> {
  let mut file =
    fs::File::open(path).map_err(|error| format!("Could not open {}: {error}", path.display()))?;
  let mut hasher = Sha256::new();
  let mut buffer = vec![0_u8; 1 << 20];
  loop {
    let read = file.read(&mut buffer).map_err(|error| error.to_string())?;
    if read == 0 {
      break;
    }
    hasher.update(&buffer[..read]);
  }
  let digest = hasher.finalize();
  let hex = digest.iter().fold(String::new(), |mut hex, byte| {
    let _ = write!(hex, "{byte:02x}");
    hex
  });
  Ok(hex[..ID_LENGTH].to_string())
}

/// Copies an ONNX file into the library after checking that it loads as a
/// supported detection model.
///
/// # Errors
/// Returns an error if the file cannot be read or copied, or is not a
/// supported model.
pub fn import(source: &Path) -> Result<DetectionModelInfo, String> {
  let _mutation = MUTATIONS.lock().map_err(|error| error.to_string())?;
  let dir = models_dir()?;
  fs::create_dir_all(&dir)
    .map_err(|error| format!("Could not create {}: {error}", dir.display()))?;
  import_into(source, &dir)
}

/// # Errors
/// Returns an error if staging, validation or installation fails.
fn import_into(source: &Path, dir: &Path) -> Result<DetectionModelInfo, String> {
  import_named_into(source, dir, None, None)
}

/// Installs a verified catalog download with its display name. Cancellation is
/// checked after native model validation, before publishing any library files.
///
/// # Errors
/// Returns an error for cancellation, invalid models, or filesystem failures.
pub(super) fn import_download(
  source: &Path,
  name: &str,
  cancellation: &CancellationToken,
  dir: &Path,
) -> Result<DetectionModelInfo, String> {
  let _mutation = MUTATIONS.lock().map_err(|error| error.to_string())?;
  fs::create_dir_all(dir).map_err(|error| error.to_string())?;
  import_named_into(source, dir, Some(name), Some(cancellation))
}

/// # Errors
/// Returns an error if staging, validation or installation fails or is cancelled.
fn import_named_into(
  source: &Path,
  dir: &Path,
  name: Option<&str>,
  cancellation: Option<&CancellationToken>,
) -> Result<DetectionModelInfo, String> {
  let check_cancelled = || {
    if cancellation.is_some_and(CancellationToken::is_cancelled) {
      Err("Model download cancelled".to_string())
    } else {
      Ok(())
    }
  };
  check_cancelled()?;
  let size = fs::metadata(source).map_err(|error| error.to_string())?.len();
  if size == 0 || size > 512 * 1024 * 1024 {
    return Err("Detection model files must be between 1 byte and 512 MiB".into());
  }
  let staged = tempfile::NamedTempFile::new_in(dir).map_err(|error| error.to_string())?;
  fs::copy(source, staged.path()).map_err(|error| format!("Could not copy the model: {error}"))?;
  let id = hash_file(staged.path())?;
  let model_path = dir.join(format!("{id}.onnx"));
  let info_path = dir.join(format!("{id}.json"));
  if model_path.is_file()
    && let Ok(raw) = fs::read_to_string(&info_path)
    && let Ok(info) = serde_json::from_str::<DetectionModelInfo>(&raw)
  {
    return Ok(info);
  }
  let name = name.map_or_else(
    || {
      source
        .file_stem()
        .map_or_else(|| id.clone(), |stem| stem.to_string_lossy().into_owned())
    },
    str::to_owned,
  );

  let (mut model, _) = DetectionModel::load(staged.path(), ExecutionProviderPreference::Cpu)?;
  model.validate()?;

  let info = DetectionModelInfo {
    id,
    name,
    file_size: fs::metadata(staged.path()).map_or(0, |metadata| metadata.len()),
    imported_at: SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map_or(0, |elapsed| elapsed.as_millis() as u64),
    description: model.description().clone(),
  };
  drop(model);
  check_cancelled()?;

  let is_new_model = !model_path.exists();
  let finish = || -> Result<(), String> {
    let serialized = serde_json::to_string_pretty(&info).map_err(|error| error.to_string())?;
    if !model_path.exists() {
      staged.persist_noclobber(&model_path).map_err(|error| error.to_string())?;
    }
    let metadata = tempfile::NamedTempFile::new_in(dir).map_err(|error| error.to_string())?;
    fs::write(metadata.path(), serialized).map_err(|error| error.to_string())?;
    metadata.persist(&info_path).map_err(|error| error.to_string())?;
    Ok(())
  };
  if let Err(error) = finish() {
    if is_new_model {
      let _ = fs::remove_file(&model_path);
    }
    return Err(format!("Could not save the model: {error}"));
  }
  Ok(info)
}

/// # Errors
/// Returns an error if the ID is malformed or the files cannot be removed.
pub fn delete(id: &str) -> Result<(), String> {
  let _mutation = MUTATIONS.lock().map_err(|error| error.to_string())?;
  validate_id(id)?;
  let dir = models_dir()?;
  for extension in ["onnx", "json"] {
    match fs::remove_file(dir.join(format!("{id}.{extension}"))) {
      Ok(()) => {},
      Err(error) if error.kind() == std::io::ErrorKind::NotFound => {},
      Err(error) => return Err(format!("Could not delete the model: {error}")),
    }
  }
  Ok(())
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use super::*;

  #[test]
  fn rejects_path_traversal_ids() {
    for id in [
      "../model",
      "../../etc/passwd",
      "",
      "0123456789abcdeg",
      "0123456789abcdef.onnx",
    ] {
      assert!(validate_id(id).is_err());
    }
    assert!(validate_id("0123456789abcdef").is_ok());
  }

  #[test]
  fn failed_import_leaves_no_library_files() -> Result<(), Box<dyn std::error::Error>> {
    let source = tempfile::NamedTempFile::new()?;
    fs::write(source.path(), b"not an ONNX model")?;
    let dir = tempfile::tempdir()?;
    assert!(import_into(source.path(), dir.path()).is_err());
    assert_eq!(fs::read_dir(dir.path())?.count(), 0);
    Ok(())
  }

  #[test]
  fn oversized_import_is_rejected_before_copying_into_the_library()
  -> Result<(), Box<dyn std::error::Error>> {
    let source = tempfile::NamedTempFile::new()?;
    source.as_file().set_len(512 * 1024 * 1024 + 1)?;
    let dir = tempfile::tempdir()?;
    let error = import_into(source.path(), dir.path()).unwrap_err();
    assert!(error.contains("512 MiB"));
    assert_eq!(fs::read_dir(dir.path())?.count(), 0);
    Ok(())
  }

  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS pointing to local YOLO11 and YOLO26 ONNX files"]
  fn imports_real_models_and_duplicate_imports_preserve_installed_files()
  -> Result<(), Box<dyn std::error::Error>> {
    let models = PathBuf::from(std::env::var("MANA_FISH_TEST_MODELS")?);
    let dir = tempfile::tempdir()?;
    for name in ["yolo11n.onnx", "yolo26n.onnx"] {
      let source = models.join(name);
      let info = import_into(&source, dir.path())?;
      assert_eq!(info.description.classes.len(), 80);
      assert_eq!(info.description.input_width, 640);
      let path = dir.path().join(format!("{}.onnx", info.id));
      let modified = fs::metadata(&path)?.modified()?;
      let duplicate = import_into(&source, dir.path())?;
      assert_eq!(duplicate.id, info.id);
      assert_eq!(duplicate.imported_at, info.imported_at);
      assert_eq!(fs::metadata(path)?.modified()?, modified);
    }
    assert_eq!(fs::read_dir(dir.path())?.count(), 4);
    Ok(())
  }
}
