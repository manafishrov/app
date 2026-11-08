//! One bounded latest value shared by IPC and the inference worker.
use std::sync::{
  Arc, Mutex,
  atomic::{AtomicBool, Ordering},
};

use serde::Deserialize;

use super::events::DetectionOptions;
use super::postprocess::DecodeOptions;
use super::tracker::{Tracker, TrackerOptions};

#[derive(Clone, Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct DetectionSettings {
  pub confidence_threshold: f32,
  pub class_ids: Option<Vec<u32>>,
}

impl DetectionSettings {
  pub fn from_options(options: &DetectionOptions) -> Self {
    Self {
      confidence_threshold: options.confidence_threshold,
      class_ids: options.class_ids.clone(),
    }
  }

  /// # Errors
  /// Rejects non-finite thresholds and oversized filters before replacing settings.
  pub fn validate(&mut self) -> Result<(), String> {
    if !self.confidence_threshold.is_finite() || !(0.01..=1.0).contains(&self.confidence_threshold)
    {
      return Err("Detection confidence must be between 0.01 and 1".into());
    }
    if let Some(classes) = &mut self.class_ids {
      if classes.len() > 4096 {
        return Err("Too many detection class filters".into());
      }
      classes.sort_unstable();
      classes.dedup();
    }
    Ok(())
  }

  pub fn decoder(&self) -> DecodeOptions<'_> {
    DecodeOptions {
      // Low scores may continue existing tracks, but cannot create new ones.
      min_confidence: self.confidence_threshold.min(0.1),
      iou_threshold: 0.7,
      max_detections: 300,
      classes: self.class_ids.as_deref(),
    }
  }

  pub fn tracker(&self) -> Tracker {
    Tracker::new(TrackerOptions {
      high_confidence: self.confidence_threshold,
      match_iou: 0.2,
      low_match_iou: 0.5,
      max_missed_frames: 30,
      min_hits: 2,
    })
  }
}

pub type LiveSettings = Arc<Mutex<DetectionSettings>>;

/// A run-scoped update target, cloned while briefly holding the runner lock.
/// Waiting for a frame's postprocessing never makes frame submission busy.
pub struct SettingsTarget {
  run_id: u32,
  stop: Arc<AtomicBool>,
  latest: LiveSettings,
}

impl SettingsTarget {
  pub fn new(run_id: u32, stop: Arc<AtomicBool>, latest: LiveSettings) -> Self {
    Self {
      run_id,
      stop,
      latest,
    }
  }

  /// # Errors
  /// Rejects invalid settings and runs stopped/replaced while waiting for a frame.
  pub fn update(&self, run_id: u32, mut settings: DetectionSettings) -> Result<(), String> {
    settings.validate()?;
    let mut latest = self.latest.lock().map_err(|error| error.to_string())?;
    if run_id != self.run_id || self.stop.load(Ordering::Relaxed) {
      return Err("Detection session has stopped".into());
    }
    *latest = settings;
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::unwrap_used, clippy::missing_panics_doc)]
  use super::*;

  #[test]
  fn update_waiting_for_postprocessing_cannot_modify_a_stopped_run() {
    let latest = Arc::new(Mutex::new(DetectionSettings {
      confidence_threshold: 0.4,
      class_ids: None,
    }));
    let stop = Arc::new(AtomicBool::new(false));
    let target = SettingsTarget::new(7, Arc::clone(&stop), Arc::clone(&latest));
    let guard = latest.lock().unwrap();
    let update = std::thread::spawn(move || {
      target.update(
        7,
        DetectionSettings {
          confidence_threshold: 0.8,
          class_ids: None,
        },
      )
    });
    stop.store(true, Ordering::Relaxed);
    drop(guard);
    assert!(update.join().unwrap().is_err());
    assert_eq!(latest.lock().unwrap().confidence_threshold, 0.4);
  }

  #[test]
  fn validates_finite_thresholds_and_bounds_the_latest_filter() {
    let mut settings = DetectionSettings {
      confidence_threshold: f32::NAN,
      class_ids: None,
    };
    assert!(settings.validate().is_err());
    settings.confidence_threshold = 0.5;
    settings.class_ids = Some(vec![0; 4097]);
    assert!(settings.validate().is_err());
    settings.class_ids = Some(vec![3, 1, 3]);
    settings.validate().unwrap();
    assert_eq!(settings.class_ids, Some(vec![1, 3]));
    assert_eq!(settings.decoder().min_confidence, 0.1);
    settings.confidence_threshold = 0.05;
    assert_eq!(settings.decoder().min_confidence, 0.05);
  }
}
