#[cfg(desktop)]
use std::path::PathBuf;
use std::sync::Arc;

use tauri::ipc::Channel;
use tauri::{State, command};

use crate::detection::DetectionRuntime;
use crate::detection::catalog::{self, CatalogModel, DownloadProgress};
use crate::detection::library::{self, DetectionModelInfo};
use crate::detection::model::ExecutionProviderPreference;
use crate::detection::runner::{DetectionEvent, DetectionOptions, DetectionRunner};

/// Preferences supported by the backends shipped in this native build.
#[command]
pub fn list_detection_execution_providers() -> Vec<ExecutionProviderPreference> {
  crate::detection::model::supported_preferences()
}

#[command]
/// # Errors
/// Returns an error if the built-in model catalog is invalid.
pub fn list_detection_catalog() -> Result<Vec<CatalogModel>, String> {
  catalog::list()
}

#[command]
/// # Errors
/// Returns an error if the download, integrity check or model validation fails.
pub async fn download_detection_model(
  runtime: State<'_, DetectionRuntime>,
  id: String,
  on_progress: Channel<DownloadProgress>,
) -> Result<DetectionModelInfo, String> {
  runtime
    .downloads
    .install(&id, |progress| {
      let _ = on_progress.send(progress);
    })
    .await
}

#[command]
/// # Errors
/// Returns an error if the download state is unavailable.
#[allow(
  clippy::needless_pass_by_value,
  reason = "Tauri injects owned command arguments"
)]
pub fn cancel_detection_model_download(
  runtime: State<'_, DetectionRuntime>,
  id: String,
) -> Result<(), String> {
  runtime.downloads.cancel(&id)
}

#[command]
/// # Errors
/// Returns an error if the models directory cannot be read.
pub async fn list_detection_models() -> Result<Vec<DetectionModelInfo>, String> {
  tauri::async_runtime::spawn_blocking(library::list)
    .await
    .map_err(|error| error.to_string())?
}

#[command]
/// Copies an ONNX model into the app's model library after validating it.
///
/// # Errors
/// Returns an error if the file is not a supported detection model or cannot
/// be copied.
pub async fn import_detection_model(path: String) -> Result<DetectionModelInfo, String> {
  #[cfg(mobile)]
  {
    let _ = path;
    Err("Use the model file picker to import into mobile storage".into())
  }
  #[cfg(desktop)]
  tauri::async_runtime::spawn_blocking(move || library::import(&PathBuf::from(path)))
    .await
    .map_err(|error| error.to_string())?
}

#[command]
/// Imports a model using the platform picker, including sandboxed mobile copies.
/// # Errors
/// Returns an error if picking, copying or validating the model fails.
pub async fn pick_detection_model(
  app: tauri::AppHandle,
) -> Result<Option<DetectionModelInfo>, String> {
  let file_type = crate::files::FileType {
    name: "ONNX model",
    extension: "onnx",
    mime_type: "*/*",
  };
  let Some(path) = crate::files::pick_file(&app, None, file_type).await? else {
    return Ok(None);
  };
  tauri::async_runtime::spawn_blocking(move || {
    let result = library::import(&path);
    // Mobile pickers return a disposable local copy, never the original document.
    #[cfg(mobile)]
    let _ = std::fs::remove_file(&path);
    result.map(Some)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[cfg(mobile)]
#[command]
/// Accepts a bounded raw frame packet; acknowledges it only after inference.
/// # Errors
/// Rejects malformed frames and stale/stopped capture sessions.
pub async fn submit_detection_frame(
  runtime: State<'_, DetectionRuntime>,
  request: tauri::ipc::Request<'_>,
) -> Result<(), String> {
  let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
    return Err("Detection frames require a binary body".into());
  };
  let frame = crate::detection::mobile_frame::MobileFrame::parse(bytes.as_slice())?;
  let completion = runtime
    .runner
    .try_lock()
    .map_err(|_| "Detection capture session is changing".to_string())?
    .as_ref()
    .ok_or("Detection is stopped")?
    .submit(frame)?;
  completion.await.map_err(|_| "Detection session ended".to_string())?
}

#[command]
/// Deletes a model, stopping detection first if it is using it.
///
/// # Errors
/// Returns an error if the model files cannot be removed.
pub async fn delete_detection_model(
  runtime: State<'_, DetectionRuntime>,
  id: String,
) -> Result<(), String> {
  let runners = Arc::clone(&runtime.runner);
  tauri::async_runtime::spawn_blocking(move || {
    let mut runner = runners.lock().map_err(|error| error.to_string())?;
    if let Some(running) = runner.take_if(|runner| runner.model_id() == id) {
      running.stop_and_wait();
    }
    library::delete(&id)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[command]
/// Replaces postprocessing settings without reloading a model or stream.
/// # Errors
/// Rejects stale runs, invalid settings and unavailable workers.
pub async fn update_detection_settings(
  runtime: State<'_, DetectionRuntime>,
  run_id: u32,
  settings: crate::detection::settings::DetectionSettings,
) -> Result<(), String> {
  let runners = Arc::clone(&runtime.runner);
  tauri::async_runtime::spawn_blocking(move || {
    let runners = runners.lock().map_err(|error| error.to_string())?;
    runners
      .as_ref()
      .ok_or("Detection session has stopped")?
      .update_settings(run_id, settings)
  })
  .await
  .map_err(|error| error.to_string())?
}

#[command]
/// Starts detection, replacing any detection already running. Progress,
/// results and errors are reported through `on_event`.
///
/// # Errors
/// Returns an error if the detection state is unavailable.
pub async fn start_detection(
  runtime: State<'_, DetectionRuntime>,
  options: DetectionOptions,
  on_event: Channel<DetectionEvent>,
) -> Result<(), String> {
  let runners = Arc::clone(&runtime.runner);
  #[cfg(mobile)]
  let suspended = Arc::clone(&runtime.suspended);
  tauri::async_runtime::spawn_blocking(move || {
    let mut runner = runners.lock().map_err(|error| error.to_string())?;
    if let Some(previous) = runner.take() {
      previous.stop_and_wait();
    }
    #[cfg(mobile)]
    if suspended.load(std::sync::atomic::Ordering::Relaxed) {
      return Err("Detection is paused while the app is in the background".into());
    }
    *runner = Some(DetectionRunner::start(options, on_event)?);
    #[cfg(mobile)]
    if suspended.load(std::sync::atomic::Ordering::Relaxed)
      && let Some(runner) = runner.take()
    {
      runner.stop_and_wait();
    }
    Ok(())
  })
  .await
  .map_err(|error| error.to_string())?
}

#[command]
/// # Errors
/// Returns an error if the detection state is unavailable.
pub async fn stop_detection(runtime: State<'_, DetectionRuntime>) -> Result<(), String> {
  let runners = Arc::clone(&runtime.runner);
  tauri::async_runtime::spawn_blocking(move || {
    if let Some(runner) = runners.lock().map_err(|error| error.to_string())?.take() {
      runner.stop_and_wait();
    }
    Ok(())
  })
  .await
  .map_err(|error| error.to_string())?
}
