use std::collections::HashMap;
use std::collections::hash_map::Entry;
use std::fs;
use std::path::Path;
use std::sync::{LazyLock, Mutex};

use ffmpeg_next as ffmpeg;
use serde_json::Value;
use tauri::{State, command};

static RECORDING_FILES: LazyLock<Mutex<HashMap<String, fs::File>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

use crate::models::actions::{CustomAction, DirectionVector};
use crate::models::toast::ToastContent;
use crate::toast::{toast_error, toast_loading, toast_success};
use crate::websocket::client::{DirectionVectorSendChannelState, MessageSendChannelState};
use crate::websocket::send::actions::{
  handle_send_custom_action, handle_send_direction_vector, handle_set_desired_depth,
  handle_toggle_auto_stabilization, handle_toggle_depth_hold,
};
use crate::{log_error, log_info};

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn send_direction_vector(
  state: State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
) -> Result<(), String> {
  handle_send_direction_vector(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn send_custom_action(
  state: State<'_, MessageSendChannelState>,
  payload: CustomAction,
) -> Result<(), String> {
  handle_send_custom_action(&state, payload).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn toggle_auto_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_auto_stabilization(&state).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn toggle_depth_hold(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_toggle_depth_hold(&state).await
}

#[command]
/// # Errors
/// Returns an error if the websocket send channel is unavailable.
pub async fn set_desired_depth(
  state: State<'_, MessageSendChannelState>,
  depth: f32,
) -> Result<(), String> {
  handle_set_desired_depth(&state, depth).await
}

fn recording_toast_identifier(temp_path: &str) -> String {
  format!("save_recording_{}", temp_path.replace(['/', '\\'], "_"))
}

fn show_recording_save_error(toast_identifier: &str) {
  toast_error(
    Some(toast_identifier.to_string()),
    ToastContent {
      message_key: "toasts_recording_save_failed".to_string(),
      message_args: None,
      description_key: None,
      description_args: None,
    },
    None,
  );
}

fn show_recording_save_started(toast_identifier: &str) {
  toast_loading(
    Some(toast_identifier.to_string()),
    ToastContent {
      message_key: "toasts_recording_converting_to_mp4".to_string(),
      message_args: None,
      description_key: None,
      description_args: None,
    },
    None,
  );
}

fn show_recording_save_success(toast_identifier: &str, output_path: &Path) {
  let mut description_args = HashMap::<String, Value>::new();
  let _ =
    description_args.insert("path".to_string(), Value::from(output_path.display().to_string()));

  toast_success(
    Some(toast_identifier.to_string()),
    ToastContent {
      message_key: "toasts_recording_saved_successfully".to_string(),
      message_args: None,
      description_key: Some("toasts_recording_saved_path".to_string()),
      description_args: Some(description_args),
    },
    None,
  );
}

fn output_path_for_recording(temp_path: &str) -> String {
  temp_path.replace("_temp.webm", ".mp4")
}

/// # Errors
/// Returns an error if FFmpeg cannot be initialized.
fn initialize_ffmpeg(toast_identifier: &str) -> Result<(), String> {
  ffmpeg::init().map_err(|error| {
    log_error!("Failed to initialize FFmpeg: {error}");
    show_recording_save_error(toast_identifier);
    format!("Failed to initialize FFmpeg: {error}")
  })
}

/// # Errors
/// Returns an error if the input file is missing, unreadable, or contains no
/// streams.
fn open_input_context(
  temp_path: &str,
  toast_identifier: &str,
) -> Result<ffmpeg::format::context::Input, String> {
  let input_path = Path::new(temp_path);
  if !input_path.exists() {
    log_error!("Recording file does not exist: {temp_path}");
    show_recording_save_error(toast_identifier);
    return Err("Recording file not found".to_string());
  }

  let context = match ffmpeg::format::input(input_path) {
    Ok(context) => context,
    Err(error) => {
      log_error!("Failed to open input {temp_path}: {error}");
      show_recording_save_error(toast_identifier);
      return Err(format!(
        "Failed to open input {temp_path}: {error}. Check file permissions."
      ));
    },
  };

  if context.streams().count() == 0 {
    log_error!("Recording file is empty (no streams): {temp_path}");
    let _ = fs::remove_file(temp_path);
    show_recording_save_error(toast_identifier);
    return Err("Recording file is empty".to_string());
  }

  Ok(context)
}

/// # Errors
/// Returns an error if the output file or any FFmpeg stream cannot be created.
fn create_output_context(
  input_context: &ffmpeg::format::context::Input,
  output_path: &Path,
  toast_identifier: &str,
) -> Result<ffmpeg::format::context::Output, String> {
  let mut output_context = match ffmpeg::format::output(output_path) {
    Ok(context) => context,
    Err(error) => {
      log_error!("Failed to create output {}: {}", output_path.display(), error);
      show_recording_save_error(toast_identifier);
      return Err(format!(
        "Failed to create output {}: {error}. On Windows, check that Controlled Folder Access is not blocking the app.",
        output_path.display()
      ));
    },
  };

  for stream in input_context.streams() {
    let mut output_stream =
      match output_context.add_stream(ffmpeg::encoder::find(stream.parameters().id())) {
        Ok(output_stream) => output_stream,
        Err(error) => {
          show_recording_save_error(toast_identifier);
          return Err(format!("Failed to find encoder: {error}"));
        },
      };
    output_stream.set_parameters(stream.parameters());
    output_stream.set_time_base(stream.time_base());
  }

  if let Err(error) = output_context.write_header() {
    log_error!("Failed to write header: {error}");
    show_recording_save_error(toast_identifier);
    return Err(format!("Failed to write header: {error}"));
  }

  Ok(output_context)
}

/// # Errors
/// Returns an error if copying any FFmpeg packet into the output fails.
fn copy_packets(
  input_context: &mut ffmpeg::format::context::Input,
  output_context: &mut ffmpeg::format::context::Output,
  toast_identifier: &str,
) -> Result<(), String> {
  for (stream, mut packet) in input_context.packets() {
    let Some(output_stream) = output_context.stream(stream.index()) else {
      show_recording_save_error(toast_identifier);
      return Err(format!("Missing output stream for input stream {}", stream.index()));
    };

    packet.rescale_ts(stream.time_base(), output_stream.time_base());
    if let Err(error) = packet.write_interleaved(output_context) {
      show_recording_save_error(toast_identifier);
      return Err(format!("Failed to write packet: {error}"));
    }
  }

  Ok(())
}

/// # Errors
/// Returns an error if FFmpeg cannot finish writing the output file.
fn finalize_output(
  output_context: &mut ffmpeg::format::context::Output,
  toast_identifier: &str,
) -> Result<(), String> {
  if let Err(error) = output_context.write_trailer() {
    log_error!("Failed to write trailer: {error}");
    show_recording_save_error(toast_identifier);
    return Err(format!("Failed to write trailer: {error}"));
  }

  Ok(())
}

fn close_cached_recording_file(temp_path: &str) {
  if let Ok(mut files) = RECORDING_FILES.lock() {
    files.remove(temp_path);
  }
}

fn remove_temp_file(temp_path: &str) {
  const MAX_RETRIES: u32 = 3;
  const RETRY_DELAY: std::time::Duration = std::time::Duration::from_millis(100);

  for attempt in 0..MAX_RETRIES {
    match fs::remove_file(temp_path) {
      Ok(()) => return,
      Err(error) if attempt + 1 < MAX_RETRIES => {
        log_info!(
          "Retrying temp file removal (attempt {}/{}): {error}",
          attempt + 1,
          MAX_RETRIES
        );
        std::thread::sleep(RETRY_DELAY);
      },
      Err(error) => {
        log_error!("Failed to remove temp file {temp_path} after {MAX_RETRIES} attempts: {error}");
      },
    }
  }
}

#[command]
/// # Errors
/// Returns an error if FFmpeg cannot convert the temporary recording into an
/// MP4 file.
pub async fn save_recording(temp_path: String) -> Result<(), String> {
  let toast_identifier = recording_toast_identifier(&temp_path);
  show_recording_save_started(&toast_identifier);

  let temp_path_clone = temp_path.clone();
  let toast_id_clone = toast_identifier.clone();

  tokio::task::spawn_blocking(move || {
    log_info!("Starting recording conversion for {}", temp_path_clone);
    close_cached_recording_file(&temp_path_clone);

    let output_path_string = output_path_for_recording(&temp_path_clone);
    let output_path = Path::new(&output_path_string);

    initialize_ffmpeg(&toast_id_clone)?;

    {
      let mut input_context = open_input_context(&temp_path_clone, &toast_id_clone)?;
      let mut output_context =
        create_output_context(&input_context, output_path, &toast_id_clone)?;
      copy_packets(&mut input_context, &mut output_context, &toast_id_clone)?;
      finalize_output(&mut output_context, &toast_id_clone)?;
    }

    remove_temp_file(&temp_path_clone);

    log_info!("Recording conversion completed for {}", temp_path_clone);
    show_recording_save_success(&toast_id_clone, output_path);

    Ok(())
  })
  .await
  .map_err(|e| {
    show_recording_save_error(&toast_identifier);
    format!("Recording conversion task failed: {e}")
  })?
}

#[command]
/// # Errors
/// Returns an error if the temporary file cannot be opened or written.
pub async fn append_recording_chunk(temp_path: String, chunk: Vec<u8>) -> Result<(), String> {
  tokio::task::spawn_blocking(move || {
    use std::io::Write;

    let mut files = RECORDING_FILES
      .lock()
      .map_err(|_| "Recording file cache lock poisoned".to_string())?;

    let file = match files.entry(temp_path) {
      Entry::Occupied(entry) => entry.into_mut(),
      Entry::Vacant(entry) => {
        let f = fs::OpenOptions::new()
          .create(true)
          .append(true)
          .open(entry.key())
          .map_err(|e| {
            if e.kind() == std::io::ErrorKind::PermissionDenied {
              format!(
                "Permission denied writing to {}. On Windows, check that Controlled Folder Access is not blocking the app.",
                entry.key()
              )
            } else {
              format!("Failed to open file: {e}")
            }
          })?;
        entry.insert(f)
      },
    };

    file
      .write_all(&chunk)
      .map_err(|e| format!("Failed to write chunk: {e}"))
  })
  .await
  .map_err(|e| format!("Recording chunk task failed: {e}"))?
}
