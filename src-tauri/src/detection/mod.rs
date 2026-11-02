//! Object detection on the ROV camera stream with ONNX YOLO models.

pub mod catalog;
pub mod library;
pub mod model;
pub mod postprocess;
pub mod runner;
pub mod stream;
pub mod tracker;

use std::sync::{Arc, Mutex};

use runner::DetectionRunner;

#[derive(Default)]
pub struct DetectionRuntime {
  pub runner: Arc<Mutex<Option<DetectionRunner>>>,
  pub downloads: catalog::ModelDownloads,
}
