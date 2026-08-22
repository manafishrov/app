use std::collections::HashMap;
use std::collections::hash_map::Entry;
use std::fs;
use std::path::Path;
use std::sync::{LazyLock, Mutex};

use ffmpeg_next as ffmpeg;
use serde_json::Value;

use crate::models::toast::ToastContent;
use crate::toast::{toast_error, toast_loading, toast_success};
use crate::{log_error, log_info};

static RECORDING_FILES: LazyLock<Mutex<HashMap<String, fs::File>>> =
  LazyLock::new(|| Mutex::new(HashMap::new()));

fn toast_identifier(temp_path: &str) -> String {
  format!("save_recording_{}", temp_path.replace(['/', '\\'], "_"))
}

fn show_save_error(toast_id: &str) {
  toast_error(
    Some(toast_id.to_string()),
    ToastContent {
      message_key: "toasts_recording_save_failed".to_string(),
      message_args: None,
      description_key: None,
      description_args: None,
    },
    None,
  );
}

fn show_save_started(toast_id: &str) {
  toast_loading(
    Some(toast_id.to_string()),
    ToastContent {
      message_key: "toasts_recording_converting_to_mp4".to_string(),
      message_args: None,
      description_key: None,
      description_args: None,
    },
    None,
  );
}

fn show_save_success(toast_id: &str, output_path: &Path) {
  let mut description_args = HashMap::<String, Value>::new();
  let display_name = output_path
    .file_name()
    .map_or_else(|| output_path.display().to_string(), |name| name.to_string_lossy().into_owned());
  let _ = description_args.insert("path".to_string(), Value::from(display_name));

  toast_success(
    Some(toast_id.to_string()),
    ToastContent {
      message_key: "toasts_recording_saved_successfully".to_string(),
      message_args: None,
      description_key: Some("toasts_recording_saved_path".to_string()),
      description_args: Some(description_args),
    },
    None,
  );
}

/// Map a temp recording path (`..._temp.<ext>`) to its final `.mp4` path. The
/// temp extension varies by platform (mp4/mkv/webm), so match the `_temp.`
/// marker rather than a fixed extension.
fn output_path_for(temp_path: &str) -> String {
  match temp_path.rfind("_temp.") {
    Some(index) => format!("{}.mp4", &temp_path[..index]),
    None => temp_path.to_string(),
  }
}

/// # Errors
/// Returns an error if FFmpeg cannot be initialized.
fn initialize_ffmpeg(toast_id: &str) -> Result<(), String> {
  ffmpeg::init().map_err(|error| {
    log_error!("Failed to initialize FFmpeg: {error}");
    show_save_error(toast_id);
    format!("Failed to initialize FFmpeg: {error}")
  })
}

/// # Errors
/// Returns an error if the input file is missing, unreadable, or contains no
/// streams.
fn open_input_context(
  temp_path: &str,
  toast_id: &str,
) -> Result<ffmpeg::format::context::Input, String> {
  let input_path = Path::new(temp_path);
  if !input_path.exists() {
    log_error!("Recording file does not exist: {temp_path}");
    show_save_error(toast_id);
    return Err("Recording file not found".to_string());
  }

  let context = match ffmpeg::format::input(input_path) {
    Ok(context) => context,
    Err(error) => {
      log_error!("Failed to open input {temp_path}: {error}");
      show_save_error(toast_id);
      return Err(format!("Failed to open input {temp_path}: {error}. Check file permissions."));
    },
  };

  if context.streams().count() == 0 {
    log_error!("Recording file is empty (no streams): {temp_path}");
    let _ = fs::remove_file(temp_path);
    show_save_error(toast_id);
    return Err("Recording file is empty".to_string());
  }

  Ok(context)
}

/// # Errors
/// Returns an error if the output file or any FFmpeg stream cannot be created.
fn create_output_context(
  input_context: &ffmpeg::format::context::Input,
  output_path: &Path,
  toast_id: &str,
) -> Result<ffmpeg::format::context::Output, String> {
  let mut output_context = match ffmpeg::format::output(output_path) {
    Ok(context) => context,
    Err(error) => {
      log_error!("Failed to create output {}: {}", output_path.display(), error);
      show_save_error(toast_id);
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
          show_save_error(toast_id);
          return Err(format!("Failed to find encoder: {error}"));
        },
      };
    output_stream.set_parameters(stream.parameters());
    unsafe {
      (*output_stream.parameters().as_mut_ptr()).codec_tag = 0;
    }
    output_stream.set_time_base(stream.time_base());
  }

  if let Err(error) = output_context.write_header() {
    log_error!("Failed to write header: {error}");
    show_save_error(toast_id);
    return Err(format!("Failed to write header: {error}"));
  }

  Ok(output_context)
}

/// # Errors
/// Returns an error if copying any FFmpeg packet into the output fails.
fn copy_packets(
  input_context: &mut ffmpeg::format::context::Input,
  output_context: &mut ffmpeg::format::context::Output,
  toast_id: &str,
) -> Result<(), String> {
  let mut last_dts = HashMap::<usize, i64>::new();

  for (stream, mut packet) in input_context.packets() {
    let Some(output_stream) = output_context.stream(stream.index()) else {
      show_save_error(toast_id);
      return Err(format!("Missing output stream for input stream {}", stream.index()));
    };

    packet.rescale_ts(stream.time_base(), output_stream.time_base());
    packet.set_position(-1);
    packet.set_stream(stream.index());
    if packet.duration() > i64::from(i32::MAX) {
      packet.set_duration(0);
    }

    if let Some(dts) = packet.dts() {
      let idx = stream.index();
      let prev = last_dts.get(&idx).copied().unwrap_or(i64::MIN);
      if dts <= prev {
        let offset = prev + 1 - dts;
        packet.set_dts(Some(prev + 1));
        if let Some(pts) = packet.pts() {
          packet.set_pts(Some(pts + offset));
        }
      }
      last_dts.insert(idx, packet.dts().unwrap_or(dts));
    }

    if let Err(error) = packet.write_interleaved(output_context) {
      show_save_error(toast_id);
      return Err(format!("Failed to write packet: {error}"));
    }
  }

  Ok(())
}

/// # Errors
/// Returns an error if FFmpeg cannot finish writing the output file.
fn finalize_output(
  output_context: &mut ffmpeg::format::context::Output,
  toast_id: &str,
) -> Result<(), String> {
  if let Err(error) = output_context.write_trailer() {
    log_error!("Failed to write trailer: {error}");
    show_save_error(toast_id);
    return Err(format!("Failed to write trailer: {error}"));
  }

  Ok(())
}

fn close_cached_file(temp_path: &str) {
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
        log_info!("Retrying temp file removal (attempt {}/{}): {error}", attempt + 1, MAX_RETRIES);
        std::thread::sleep(RETRY_DELAY);
      },
      Err(error) => {
        log_error!("Failed to remove temp file {temp_path} after {MAX_RETRIES} attempts: {error}");
      },
    }
  }
}

/// # Errors
/// Returns an error if FFmpeg cannot convert the temporary recording into an
/// MP4 file.
pub async fn convert(temp_path: String) -> Result<(), String> {
  let toast_id = toast_identifier(&temp_path);
  show_save_started(&toast_id);

  let temp_path_clone = temp_path.clone();
  let toast_id_clone = toast_id.clone();

  tokio::task::spawn_blocking(move || {
    log_info!("Starting recording conversion for {}", temp_path_clone);
    close_cached_file(&temp_path_clone);

    let output_path_string = output_path_for(&temp_path_clone);
    let output_path = Path::new(&output_path_string);

    initialize_ffmpeg(&toast_id_clone)?;

    {
      let mut input_context = open_input_context(&temp_path_clone, &toast_id_clone)?;
      let mut output_context = create_output_context(&input_context, output_path, &toast_id_clone)?;
      copy_packets(&mut input_context, &mut output_context, &toast_id_clone)?;
      finalize_output(&mut output_context, &toast_id_clone)?;
    }

    remove_temp_file(&temp_path_clone);

    log_info!("Recording conversion completed for {}", temp_path_clone);
    show_save_success(&toast_id_clone, output_path);

    Ok(())
  })
  .await
  .map_err(|error| {
    show_save_error(&toast_id);
    format!("Recording conversion task failed: {error}")
  })?
}

/// # Errors
/// Returns an error if the temporary file cannot be opened or written.
pub async fn append_chunk(temp_path: String, chunk: Vec<u8>) -> Result<(), String> {
  tokio::task::spawn_blocking(move || {
    use std::io::Write;

    let mut files = RECORDING_FILES
      .lock()
      .map_err(|_| "Recording file cache lock poisoned".to_string())?;

    let file = match files.entry(temp_path) {
      Entry::Occupied(entry) => entry.into_mut(),
      Entry::Vacant(entry) => {
        let file = fs::OpenOptions::new()
          .create(true)
          .append(true)
          .open(entry.key())
          .map_err(|error| {
            if error.kind() == std::io::ErrorKind::PermissionDenied {
              format!(
                "Permission denied writing to {}. On Windows, check that Controlled Folder Access is not blocking the app.",
                entry.key()
              )
            } else {
              format!("Failed to open file: {error}")
            }
          })?;
        entry.insert(file)
      },
    };

    file
      .write_all(&chunk)
      .map_err(|error| format!("Failed to write chunk: {error}"))
  })
  .await
  .map_err(|error| format!("Recording chunk task failed: {error}"))?
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if the temp recording suffix is not converted into an MP4 path.
  #[test]
  fn output_path_for_replaces_temp_suffix_with_mp4() {
    assert_eq!(output_path_for("video_temp.webm"), "video.mp4");
    assert_eq!(output_path_for("/path/to/recording_temp.mp4"), "/path/to/recording.mp4");
    assert_eq!(output_path_for("test_temp.mkv"), "test.mp4");
  }

  /// # Panics
  /// Panics if non-matching or edge-case recording paths change unexpectedly.
  #[test]
  fn output_path_for_handles_non_matching_and_edge_case_inputs() {
    assert_eq!(output_path_for("video.webm"), "video.webm");
    assert_eq!(output_path_for(""), "");
  }

  /// # Panics
  /// Panics if path separators are not normalized in toast identifiers.
  #[test]
  fn toast_identifier_normalizes_path_separators() {
    assert_eq!(toast_identifier("/path/to/file.webm"), "save_recording__path_to_file.webm");
    assert_eq!(toast_identifier(r"C:\Users\video.webm"), "save_recording_C:_Users_video.webm");
  }
}
