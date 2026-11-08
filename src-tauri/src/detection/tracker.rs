//! Keeps a stable ID on each object across frames.
//!
//! A small `ByteTrack`-style tracker: confident detections are matched to
//! existing tracks first, then low-confidence detections may only continue
//! tracks that were seen in the previous frame. That keeps an object's ID while
//! the model's confidence dips (turbidity, partial occlusion) without starting
//! new tracks from noise. Boxes are predicted forward with a smoothed constant
//! velocity instead of a Kalman filter.

use super::postprocess::{RawDetection, iou};

#[derive(Clone, Copy, Debug)]
pub struct TrackerOptions {
  /// Detections at or above this confidence can start and continue tracks.
  pub high_confidence: f32,
  /// Minimum overlap to continue a track with a confident detection.
  pub match_iou: f32,
  /// Minimum overlap to continue a track with a low-confidence detection.
  pub low_match_iou: f32,
  /// Frames a track survives without a detection before it is dropped.
  pub max_missed_frames: u32,
  /// Consecutive detections needed before a track is reported.
  pub min_hits: u32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct TrackedDetection {
  pub track_id: u64,
  pub detection: RawDetection,
}

struct Track {
  id: u64,
  class_id: u32,
  corners: [f32; 4],
  velocity: [f32; 4],
  hits: u32,
  missed_frames: u32,
}

impl Track {
  fn predicted(&self) -> [f32; 4] {
    let steps = (self.missed_frames + 1) as f32;
    std::array::from_fn(|index| self.corners[index] + self.velocity[index] * steps)
  }

  fn update(&mut self, corners: [f32; 4]) {
    const SMOOTHING: f32 = 0.6;
    let steps = (self.missed_frames + 1) as f32;
    for ((velocity, new), old) in self.velocity.iter_mut().zip(corners).zip(self.corners) {
      let observed = (new - old) / steps;
      *velocity = SMOOTHING * *velocity + (1.0 - SMOOTHING) * observed;
    }
    self.corners = corners;
    self.hits += 1;
    self.missed_frames = 0;
  }
}

pub struct Tracker {
  options: TrackerOptions,
  tracks: Vec<Track>,
  next_id: u64,
}

impl Tracker {
  pub fn new(options: TrackerOptions) -> Self {
    Self {
      options,
      tracks: Vec::new(),
      next_id: 1,
    }
  }

  /// Keeps identities through threshold changes, but forgets excluded classes.
  pub fn configure(&mut self, threshold: f32, classes: Option<&[u32]>) {
    self.options.high_confidence = threshold;
    self
      .tracks
      .retain(|track| classes.is_none_or(|ids| ids.contains(&track.class_id)));
  }

  /// Feeds one frame of detections and returns those that belong to a
  /// confirmed track. Detections must already be filtered to the lowest
  /// confidence worth tracking.
  pub fn update(&mut self, detections: &[RawDetection]) -> Vec<TrackedDetection> {
    let (high, low): (Vec<usize>, Vec<usize>) = (0..detections.len())
      .partition(|&index| detections[index].confidence >= self.options.high_confidence);

    let predictions: Vec<[f32; 4]> = self.tracks.iter().map(Track::predicted).collect();
    let mut track_taken = vec![false; self.tracks.len()];
    let mut matches: Vec<(usize, usize)> = Vec::new();

    let all_tracks: Vec<usize> = (0..self.tracks.len()).collect();
    let unmatched_high = self.associate(
      detections,
      &high,
      &all_tracks,
      &predictions,
      self.options.match_iou,
      &mut track_taken,
      &mut matches,
    );

    let recent_tracks: Vec<usize> = (0..self.tracks.len())
      .filter(|&index| !track_taken[index] && self.tracks[index].missed_frames == 0)
      .collect();
    self.associate(
      detections,
      &low,
      &recent_tracks,
      &predictions,
      self.options.low_match_iou,
      &mut track_taken,
      &mut matches,
    );

    for &(track_index, detection_index) in &matches {
      self.tracks[track_index].update(detections[detection_index].corners);
    }

    let mut results: Vec<TrackedDetection> = matches
      .iter()
      .filter(|&&(track_index, _)| self.tracks[track_index].hits >= self.options.min_hits)
      .map(|&(track_index, detection_index)| TrackedDetection {
        track_id: self.tracks[track_index].id,
        detection: detections[detection_index],
      })
      .collect();
    results.sort_by(|a, b| b.detection.confidence.total_cmp(&a.detection.confidence));

    for (index, track) in self.tracks.iter_mut().enumerate() {
      if !track_taken[index] {
        track.missed_frames += 1;
      }
    }
    let max_missed = self.options.max_missed_frames;
    let min_hits = self.options.min_hits;
    // Tentative tracks that miss a frame were probably noise.
    self.tracks.retain(|track| {
      track.missed_frames == 0 || (track.hits >= min_hits && track.missed_frames <= max_missed)
    });

    for detection_index in unmatched_high {
      let detection = &detections[detection_index];
      self.tracks.push(Track {
        id: self.next_id,
        class_id: detection.class_id,
        corners: detection.corners,
        velocity: [0.0; 4],
        hits: 1,
        missed_frames: 0,
      });
      self.next_id += 1;
      if min_hits <= 1 {
        results.push(TrackedDetection {
          track_id: self.next_id - 1,
          detection: *detection,
        });
      }
    }

    results
  }

  /// Greedily pairs detections with free tracks of the same class, best
  /// overlap first. Returns the detections left unmatched.
  #[allow(clippy::too_many_arguments)]
  fn associate(
    &self,
    detections: &[RawDetection],
    detection_indices: &[usize],
    track_indices: &[usize],
    predictions: &[[f32; 4]],
    min_iou: f32,
    track_taken: &mut [bool],
    matches: &mut Vec<(usize, usize)>,
  ) -> Vec<usize> {
    let mut pairs: Vec<(f32, usize, usize)> = Vec::new();
    for &detection_index in detection_indices {
      let detection = &detections[detection_index];
      for &track_index in track_indices {
        if track_taken[track_index] || self.tracks[track_index].class_id != detection.class_id {
          continue;
        }
        let overlap = iou(&predictions[track_index], &detection.corners);
        if overlap >= min_iou {
          pairs.push((overlap, track_index, detection_index));
        }
      }
    }
    pairs.sort_by(|a, b| b.0.total_cmp(&a.0));

    let mut detection_taken = vec![false; detections.len()];
    for (_, track_index, detection_index) in pairs {
      if track_taken[track_index] || detection_taken[detection_index] {
        continue;
      }
      track_taken[track_index] = true;
      detection_taken[detection_index] = true;
      matches.push((track_index, detection_index));
    }

    detection_indices
      .iter()
      .copied()
      .filter(|&index| !detection_taken[index])
      .collect()
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use super::*;

  const OPTIONS: TrackerOptions = TrackerOptions {
    high_confidence: 0.5,
    match_iou: 0.2,
    low_match_iou: 0.4,
    max_missed_frames: 3,
    min_hits: 2,
  };

  fn detection(class_id: u32, confidence: f32, x: f32) -> RawDetection {
    RawDetection {
      class_id,
      confidence,
      corners: [x, 0.4, x + 0.1, 0.5],
    }
  }

  fn ids(results: &[TrackedDetection]) -> Vec<u64> {
    results.iter().map(|result| result.track_id).collect()
  }

  #[test]
  fn reports_a_track_after_it_is_confirmed_and_keeps_its_id_while_moving() {
    let mut tracker = Tracker::new(OPTIONS);
    assert_eq!(tracker.update(&[detection(0, 0.9, 0.10)]).len(), 0);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.9, 0.11)])), vec![1]);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.9, 0.12)])), vec![1]);
  }

  #[test]
  fn low_confidence_detections_continue_but_never_start_tracks() {
    let mut tracker = Tracker::new(OPTIONS);
    tracker.update(&[detection(0, 0.9, 0.10)]);
    tracker.update(&[detection(0, 0.9, 0.11)]);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.2, 0.12)])), vec![1]);

    let mut fresh = Tracker::new(OPTIONS);
    fresh.update(&[detection(0, 0.2, 0.5)]);
    assert_eq!(fresh.update(&[detection(0, 0.2, 0.5)]).len(), 0);
  }

  #[test]
  fn keeps_the_id_through_a_short_gap_and_drops_it_after_a_long_one() {
    let mut tracker = Tracker::new(OPTIONS);
    tracker.update(&[detection(0, 0.9, 0.10)]);
    tracker.update(&[detection(0, 0.9, 0.11)]);
    tracker.update(&[]);
    tracker.update(&[]);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.9, 0.14)])), vec![1]);

    for _ in 0..=OPTIONS.max_missed_frames {
      tracker.update(&[]);
    }
    tracker.update(&[detection(0, 0.9, 0.14)]);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.9, 0.14)])), vec![2]);
  }

  #[test]
  fn live_settings_preserve_low_confidence_tracks_and_forget_excluded_classes() {
    let mut tracker = Tracker::new(OPTIONS);
    tracker.update(&[detection(0, 0.9, 0.1)]);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.9, 0.1)])), vec![1]);
    tracker.configure(0.95, None);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.2, 0.1)])), vec![1]);
    tracker.configure(0.1, Some(&[]));
    tracker.configure(0.1, Some(&[0]));
    assert_eq!(tracker.update(&[detection(0, 0.2, 0.1)]), []);
    assert_eq!(ids(&tracker.update(&[detection(0, 0.2, 0.1)])), vec![2]);
  }

  #[test]
  fn does_not_match_across_classes() {
    let mut tracker = Tracker::new(OPTIONS);
    tracker.update(&[detection(0, 0.9, 0.10)]);
    tracker.update(&[detection(0, 0.9, 0.10)]);
    tracker.update(&[detection(1, 0.9, 0.10)]);
    assert_eq!(ids(&tracker.update(&[detection(1, 0.9, 0.10)])), vec![2]);
  }
}
