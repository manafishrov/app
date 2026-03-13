#![allow(clippy::missing_errors_doc)]

use std::collections::HashMap;
use std::fs;
use std::path::Path;

use ffmpeg_next as ffmpeg;
use serde_json::Value;
use tauri::{State, command};

use crate::models::actions::{CustomAction, DirectionVector};
use crate::models::toast::ToastContent;
use crate::toast::{toast_error, toast_loading, toast_success};
use crate::websocket::client::{DirectionVectorSendChannelState, MessageSendChannelState};
use crate::websocket::send::actions::{
  handle_send_custom_action, handle_send_direction_vector, handle_toggle_auto_stabilization,
  handle_toggle_depth_hold,
};
use crate::{log_error, log_info};

#[command]
pub async fn send_direction_vector(
  state: State<'_, DirectionVectorSendChannelState>,
  payload: DirectionVector,
) -> Result<(), String> {
  handle_send_direction_vector(&state, payload).await
}

#[command]
pub async fn send_custom_action(
  state: State<'_, MessageSendChannelState>,
  payload: CustomAction,
) -> Result<(), String> {
  handle_send_custom_action(&state, payload).await
}

#[command]
pub async fn toggle_auto_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_auto_stabilization(&state).await
}

#[command]
pub async fn toggle_depth_hold(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_toggle_depth_hold(&state).await
}

#[command]
#[allow(clippy::too_many_lines)]
pub async fn save_recording(temp_path: String) -> Result<(), String> {
  let toast_identifier = format!("save_recording_{}", temp_path.replace(['/', '\\'], "_"));
  let show_recording_save_error = || {
    toast_error(
      Some(toast_identifier.clone()),
      ToastContent {
        message_key: "toasts_recording_save_failed".to_string(),
        message_args: None,
        description_key: None,
        description_args: None,
      },
      None,
    );
  };

  log_info!("Starting recording conversion for {}", temp_path);
  toast_loading(
    Some(toast_identifier.clone()),
    ToastContent {
      message_key: "toasts_recording_converting_to_mp4".to_string(),
      message_args: None,
      description_key: None,
      description_args: None,
    },
    None,
  );

  if let Err(e) = ffmpeg::init() {
    log_error!("Failed to initialize FFmpeg: {}", e);
    show_recording_save_error();
    return Err(format!("Failed to initialize FFmpeg: {e}"));
  }

  let input_path = Path::new(&temp_path);
  let output_name = temp_path.replace("_temp.webm", ".mp4");
  let output_path = Path::new(&output_name);

  if !input_path.exists() {
    log_error!("Recording file does not exist: {}", temp_path);
    show_recording_save_error();
    return Err("Recording file not found".to_string());
  }

  let mut ictx = match ffmpeg::format::input(&input_path) {
    Ok(ctx) => ctx,
    Err(e) => {
      log_error!("Failed to open input {}: {}", temp_path, e);
      show_recording_save_error();
      return Err(format!("Failed to open input: {e}"));
    },
  };

  if ictx.streams().count() == 0 {
    log_error!("Recording file is empty (no streams): {}", temp_path);
    fs::remove_file(&temp_path).ok();
    show_recording_save_error();
    return Err("Recording file is empty".to_string());
  }
  let mut octx = match ffmpeg::format::output(&output_path) {
    Ok(ctx) => ctx,
    Err(e) => {
      log_error!("Failed to create output {}: {}", output_path.display(), e);
      show_recording_save_error();
      return Err(format!("Failed to create output: {e}"));
    },
  };

  for stream in ictx.streams() {
    let mut ost = match octx.add_stream(ffmpeg::encoder::find(stream.parameters().id())) {
      Ok(ost) => ost,
      Err(e) => {
        show_recording_save_error();
        return Err(format!("Failed to find encoder: {e}"));
      },
    };
    ost.set_parameters(stream.parameters());
    ost.set_time_base(stream.time_base());
  }

  if let Err(e) = octx.write_header() {
    log_error!("Failed to write header: {}", e);
    show_recording_save_error();
    return Err(format!("Failed to write header: {e}"));
  }

  for (stream, mut packet) in ictx.packets() {
    let Some(output_stream) = octx.stream(stream.index()) else {
      show_recording_save_error();
      return Err(format!("Missing output stream for input stream {}", stream.index()));
    };

    packet.rescale_ts(stream.time_base(), output_stream.time_base());
    if let Err(e) = packet.write_interleaved(&mut octx) {
      show_recording_save_error();
      return Err(format!("Failed to write packet: {e}"));
    }
  }

  if let Err(e) = octx.write_trailer() {
    log_error!("Failed to write trailer: {}", e);
    show_recording_save_error();
    return Err(format!("Failed to write trailer: {e}"));
  }

  if let Err(e) = fs::remove_file(&temp_path) {
    log_error!("Failed to remove temp file {}: {}", temp_path, e);
    show_recording_save_error();
    return Err(format!("Failed to remove temp: {e}"));
  }

  log_info!("Recording conversion completed for {}", temp_path);
  let mut description_args = HashMap::<String, Value>::new();
  let _ =
    description_args.insert("path".to_string(), Value::from(output_path.display().to_string()));
  toast_success(
    Some(toast_identifier),
    ToastContent {
      message_key: "toasts_recording_saved_successfully".to_string(),
      message_args: None,
      description_key: Some("toasts_recording_saved_path".to_string()),
      description_args: Some(description_args),
    },
    None,
  );

  Ok(())
}

#[command]
pub async fn append_recording_chunk(temp_path: String, chunk: Vec<u8>) -> Result<(), String> {
  use std::fs::OpenOptions;
  use std::io::Write;

  let mut file = OpenOptions::new()
    .create(true)
    .append(true)
    .open(&temp_path)
    .map_err(|e| format!("Failed to open file: {e}"))?;

  file.write_all(&chunk).map_err(|e| format!("Failed to write chunk: {e}"))?;

  file.sync_all().map_err(|e| format!("Failed to sync file: {e}"))?;

  Ok(())
}
