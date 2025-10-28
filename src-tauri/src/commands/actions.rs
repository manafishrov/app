use crate::models::actions::{CustomAction, DirectionVector};
use crate::toast::{toast_error, toast_loading, toast_success};
use crate::websocket::{
  client::{DirectionVectorSendChannelState, MessageSendChannelState},
  send::actions::{
    handle_send_custom_action, handle_send_direction_vector, handle_toggle_depth_hold,
    handle_toggle_pitch_stabilization, handle_toggle_roll_stabilization,
  },
};
use crate::{log_error, log_info};
use chrono::Utc;
use ffmpeg_next as ffmpeg;
use std::fs;
use std::path::Path;
use tauri::{command, State};

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
pub async fn toggle_pitch_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_pitch_stabilization(&state).await
}

#[command]
pub async fn toggle_roll_stabilization(
  state: State<'_, MessageSendChannelState>,
) -> Result<(), String> {
  handle_toggle_roll_stabilization(&state).await
}

#[command]
pub async fn toggle_depth_hold(state: State<'_, MessageSendChannelState>) -> Result<(), String> {
  handle_toggle_depth_hold(&state).await
}

#[command]
pub async fn save_recording(temp_path: String) -> Result<(), String> {
  let toast_id = format!("save_recording_{}", temp_path.replace(['/', '\\'], "_"));

  log_info!("Starting recording conversion for {}", temp_path);
  toast_loading(
    Some(toast_id.clone()),
    "Converting recording to MP4...".to_string(),
    None,
    None,
  );

  if let Err(e) = ffmpeg::init() {
    log_error!("Failed to initialize FFmpeg: {}", e);
    toast_error(
      Some(toast_id.clone()),
      "Failed to save recording".to_string(),
      None,
      None,
    );
    return Err(format!("Failed to initialize FFmpeg: {}", e));
  }

  let input_path = Path::new(&temp_path);
  let output_path = input_path.with_file_name(format!(
    "Recording_{}.mp4",
    Utc::now().format("%Y-%m-%d_%H-%M-%S")
  ));

  if !input_path.exists() {
    log_error!("Recording file does not exist: {}", temp_path);
    toast_error(
      Some(toast_id.clone()),
      "Failed to save recording".to_string(),
      None,
      None,
    );
    return Err("Recording file not found".to_string());
  }

  let mut ictx = match ffmpeg::format::input(&input_path) {
    Ok(ctx) => ctx,
    Err(e) => {
      log_error!("Failed to open input {}: {}", temp_path, e);
      toast_error(
        Some(toast_id.clone()),
        "Failed to save recording".to_string(),
        None,
        None,
      );
      return Err(format!("Failed to open input: {}", e));
    }
  };

  if ictx.streams().count() == 0 {
    log_error!("Recording file is empty (no streams): {}", temp_path);
    fs::remove_file(&temp_path).ok();
    toast_error(
      Some(toast_id.clone()),
      "Failed to save recording".to_string(),
      None,
      None,
    );
    return Err("Recording file is empty".to_string());
  }
  let mut octx = match ffmpeg::format::output(&output_path) {
    Ok(ctx) => ctx,
    Err(e) => {
      log_error!("Failed to create output {}: {}", output_path.display(), e);
      toast_error(
        Some(toast_id.clone()),
        "Failed to save recording".to_string(),
        None,
        None,
      );
      return Err(format!("Failed to create output: {}", e));
    }
  };

  for stream in ictx.streams() {
    let mut ost = match octx.add_stream(ffmpeg::encoder::find(stream.parameters().id())) {
      Ok(ost) => ost,
      Err(e) => {
        toast_error(
          Some(toast_id.clone()),
          "Failed to save recording".to_string(),
          None,
          None,
        );
        return Err(format!("Failed to find encoder: {}", e));
      }
    };
    ost.set_parameters(stream.parameters());
    ost.set_time_base(stream.time_base());
  }

  if let Err(e) = octx.write_header() {
    log_error!("Failed to write header: {}", e);
    toast_error(
      Some(toast_id.clone()),
      "Failed to save recording".to_string(),
      None,
      None,
    );
    return Err(format!("Failed to write header: {}", e));
  }

  for (stream, mut packet) in ictx.packets() {
    packet.rescale_ts(
      stream.time_base(),
      octx.stream(stream.index()).unwrap().time_base(),
    );
    if let Err(e) = packet.write_interleaved(&mut octx) {
      toast_error(
        Some(toast_id.clone()),
        "Failed to save recording".to_string(),
        None,
        None,
      );
      return Err(format!("Failed to write packet: {}", e));
    }
  }

  if let Err(e) = octx.write_trailer() {
    log_error!("Failed to write trailer: {}", e);
    toast_error(
      Some(toast_id.clone()),
      "Failed to save recording".to_string(),
      None,
      None,
    );
    return Err(format!("Failed to write trailer: {}", e));
  }

  if let Err(e) = fs::remove_file(&temp_path) {
    log_error!("Failed to remove temp file {}: {}", temp_path, e);
    toast_error(
      Some(toast_id.clone()),
      "Failed to save recording".to_string(),
      None,
      None,
    );
    return Err(format!("Failed to remove temp: {}", e));
  }

  log_info!("Recording conversion completed for {}", temp_path);
  toast_success(
    Some(toast_id),
    "Recording saved successfully".to_string(),
    Some(format!("Saved to {}", output_path.display())),
    None,
  );

  Ok(())
}
