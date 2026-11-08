use super::model::{ExecutionProvider, ExecutionProviderPreference};
use serde::{Deserialize, Serialize};

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DetectionOptions {
  pub model_id: String,
  pub execution_provider: ExecutionProviderPreference,
  pub confidence_threshold: f32,
  /// Class IDs to report; `None` reports every class.
  pub class_ids: Option<Vec<u32>>,
  #[cfg_attr(mobile, allow(dead_code))]
  pub stream_url: String,
  /// Rejects late frames from a previous frontend capture session.
  #[serde(default)]
  #[cfg_attr(desktop, allow(dead_code))]
  pub run_id: u32,
}

#[derive(Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DetectionState {
  Loading,
  Connecting,
  Running,
  Error,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Detection {
  pub track_id: u64,
  pub class_id: u32,
  pub label: String,
  pub confidence: f32,
  /// Box in 0..1 coordinates of the source frame, from the top-left corner.
  pub left: f32,
  pub top: f32,
  pub width: f32,
  pub height: f32,
}

#[derive(Serialize, Clone, Debug)]
#[serde(
  tag = "type",
  rename_all = "camelCase",
  rename_all_fields = "camelCase"
)]
pub enum DetectionEvent {
  Status {
    state: DetectionState,
    message: Option<String>,
    execution_provider: Option<ExecutionProvider>,
  },
  Detections {
    /// Milliseconds since the Unix epoch when the frame was decoded.
    captured_at: f64,
    frame_width: u32,
    frame_height: u32,
    detections: Vec<Detection>,
  },
  Stats {
    inference_fps: f32,
    /// Preprocessing, inference and postprocessing for one frame.
    inference_ms: f32,
    /// From the frame being decoded to its results being sent.
    latency_ms: f32,
  },
}
