//! One bounded latest value shared by IPC and the inference worker.
use std::sync::{Arc, Mutex};

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

#[cfg(test)]
mod tests {
  #![allow(clippy::unwrap_used, clippy::missing_panics_doc)]
  use super::*;

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
