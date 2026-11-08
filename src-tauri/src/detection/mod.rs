//! Object detection on the ROV camera stream with ONNX YOLO models.

pub mod catalog;
mod events;
pub mod library;
#[cfg(any(mobile, test))]
pub mod mobile_frame;
#[cfg(all(test, desktop))]
#[path = "mobile_runner.rs"]
mod mobile_runner_tests;
pub mod model;
pub mod postprocess;
#[cfg(desktop)]
pub mod runner;
#[cfg(mobile)]
#[path = "mobile_runner.rs"]
pub mod runner;
#[cfg(desktop)]
pub mod stream;
pub mod tracker;

use std::sync::{Arc, Mutex};

use runner::DetectionRunner;

#[derive(Default)]
pub struct DetectionRuntime {
  pub runner: Arc<Mutex<Option<DetectionRunner>>>,
  pub downloads: catalog::ModelDownloads,
  #[cfg(mobile)]
  pub suspended: Arc<std::sync::atomic::AtomicBool>,
}

mod providers;
