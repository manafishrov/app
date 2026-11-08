//! Files the user saves or opens through the system pickers.
//!
//! Desktop shows the native save/open dialogs and works on the chosen path in
//! place. Mobile has no writable path to hand out, so saves are written to a
//! staging file and then passed to the system export picker, and opened files
//! are read from a local copy the picker makes.

use std::path::{Path, PathBuf};

use tauri::AppHandle;

#[derive(Clone, Copy)]
pub struct FileType {
  // Only the desktop dialogs show a filter name.
  #[cfg_attr(mobile, allow(dead_code))]
  pub name: &'static str,
  pub extension: &'static str,
  // Only the mobile pickers filter by MIME type.
  #[cfg_attr(desktop, allow(dead_code))]
  pub mime_type: &'static str,
}

pub const JSON: FileType = FileType {
  name: "JSON",
  extension: "json",
  mime_type: "application/json",
};
pub const JSON_LINES: FileType = FileType {
  name: "JSON Lines",
  extension: "jsonl",
  mime_type: "application/jsonl",
};
pub const CSV: FileType = FileType {
  name: "CSV",
  extension: "csv",
  mime_type: "text/csv",
};
pub const PYTHON: FileType = FileType {
  name: "Python",
  extension: "py",
  // Document providers rarely know a Python MIME type; the extension is
  // checked after picking instead.
  mime_type: "*/*",
};

/// # Errors
/// Returns an error for an extension the app does not read or write.
pub fn file_type_for_extension(extension: &str) -> Result<FileType, String> {
  [JSON, JSON_LINES, CSV, PYTHON]
    .into_iter()
    .find(|file_type| file_type.extension.eq_ignore_ascii_case(extension))
    .ok_or_else(|| format!("Unsupported file type: .{extension}"))
}

pub struct SaveDestination {
  path: PathBuf,
  #[cfg(mobile)]
  staging: tempfile::TempDir,
  #[cfg(mobile)]
  file_type: FileType,
}

impl SaveDestination {
  pub fn path(&self) -> &Path {
    &self.path
  }

  /// Completes the save once the file at [`Self::path`] is written. Returns
  /// `false` if the user cancelled the mobile export picker.
  ///
  /// # Errors
  /// Returns an error if the export picker fails.
  #[cfg(desktop)]
  #[allow(clippy::unused_self)] // Shares the mobile signature, which consumes the staging dir.
  pub fn finish(self, _app: &AppHandle) -> impl Future<Output = Result<bool, String>> {
    std::future::ready(Ok(true))
  }

  /// Completes the save once the file at [`Self::path`] is written. Returns
  /// `false` if the user cancelled the mobile export picker.
  ///
  /// # Errors
  /// Returns an error if the export picker fails.
  #[cfg(mobile)]
  pub async fn finish(self, app: &AppHandle) -> Result<bool, String> {
    use tauri_plugin_manafish_mobile::MobileExt;

    let file_name = self
      .path
      .file_name()
      .and_then(std::ffi::OsStr::to_str)
      .ok_or("Invalid file name")?;
    let saved = app.mobile().export_file(&self.path, file_name, self.file_type.mime_type).await;
    drop(self.staging);
    saved
  }
}

/// Asks where to save `file_name`. Returns `None` if the user cancelled.
///
/// # Errors
/// Returns an error if the dialog fails or the staging file cannot be created.
#[cfg(desktop)]
pub async fn choose_save_destination(
  app: &AppHandle,
  title: Option<String>,
  file_name: String,
  file_type: FileType,
) -> Result<Option<SaveDestination>, String> {
  use tauri_plugin_dialog::DialogExt;

  let app = app.clone();
  let selected = tauri::async_runtime::spawn_blocking(move || {
    let mut dialog = app.dialog().file();
    if let Some(title) = title {
      dialog = dialog.set_title(title);
    }
    dialog
      .set_file_name(file_name)
      .add_filter(file_type.name, &[file_type.extension])
      .blocking_save_file()
  })
  .await
  .map_err(|error| error.to_string())?;
  selected
    .map(|file| {
      file
        .into_path()
        .map(|path| SaveDestination { path })
        .map_err(|error| error.to_string())
    })
    .transpose()
}

/// Stages `file_name` for the export picker shown by
/// [`SaveDestination::finish`].
///
/// # Errors
/// Returns an error if the staging file cannot be created.
#[cfg(mobile)]
#[allow(clippy::unused_async)]
pub async fn choose_save_destination(
  app: &AppHandle,
  _title: Option<String>,
  file_name: String,
  file_type: FileType,
) -> Result<Option<SaveDestination>, String> {
  use tauri::Manager;

  let file_name = Path::new(&file_name).file_name().ok_or("Invalid file name")?.to_owned();
  let cache_dir = app.path().app_cache_dir().map_err(|error| error.to_string())?;
  std::fs::create_dir_all(&cache_dir).map_err(|error| error.to_string())?;
  let staging = tempfile::tempdir_in(cache_dir).map_err(|error| error.to_string())?;
  Ok(Some(SaveDestination {
    path: staging.path().join(file_name),
    staging,
    file_type,
  }))
}

/// Asks the user to pick a file to open. Returns `None` if they cancelled.
///
/// # Errors
/// Returns an error if the dialog fails or the file cannot be made readable.
#[cfg(desktop)]
pub async fn pick_file(
  app: &AppHandle,
  title: Option<String>,
  file_type: FileType,
) -> Result<Option<PathBuf>, String> {
  use tauri_plugin_dialog::DialogExt;

  let app = app.clone();
  let selected = tauri::async_runtime::spawn_blocking(move || {
    let mut dialog = app.dialog().file();
    if let Some(title) = title {
      dialog = dialog.set_title(title);
    }
    dialog.add_filter(file_type.name, &[file_type.extension]).blocking_pick_file()
  })
  .await
  .map_err(|error| error.to_string())?;
  selected
    .map(|file| file.into_path().map_err(|error| error.to_string()))
    .transpose()
}

/// Asks the user to pick a file to open. Returns `None` if they cancelled.
///
/// # Errors
/// Returns an error if the picker fails or the file cannot be copied.
#[cfg(mobile)]
pub async fn pick_file(
  app: &AppHandle,
  _title: Option<String>,
  file_type: FileType,
) -> Result<Option<PathBuf>, String> {
  use tauri_plugin_manafish_mobile::MobileExt;

  // Providers often label files they do not recognise as generic binary data.
  app
    .mobile()
    .import_file(&[file_type.mime_type, "application/octet-stream"])
    .await
}
