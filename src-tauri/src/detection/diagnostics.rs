//! Opt-in, per-worker monotonic stage averages. Never logs every frame.
use std::time::{Duration, Instant};

#[derive(Clone, Copy, Debug, Default)]
pub struct ModelTimings {
  pub preprocessing: Duration,
  pub inference: Duration,
  pub decode: Duration,
}

pub struct Diagnostics {
  enabled: bool,
  since: Instant,
  frames: u32,
  stages: [Duration; 5],
}

impl Default for Diagnostics {
  fn default() -> Self {
    Self {
      enabled: std::env::var_os("MANA_FISH_DETECTION_DIAGNOSTICS")
        .is_some_and(|value| value == "1"),
      since: Instant::now(),
      frames: 0,
      stages: [Duration::ZERO; 5],
    }
  }
}

impl Diagnostics {
  pub fn record(&mut self, queue: Duration, model: ModelTimings, tracking: Duration) {
    if !self.enabled {
      return;
    }
    self.frames += 1;
    for (sum, value) in self.stages.iter_mut().zip([
      queue, model.preprocessing, model.inference, model.decode, tracking,
    ]) {
      *sum += value;
    }
    if self.since.elapsed() >= Duration::from_secs(1) {
      let ms = self.stages.map(|value| value.as_secs_f64() * 1000.0 / f64::from(self.frames));
      crate::log_info!(
        "Detection stage averages ({} frames): native queue {:.2} ms, preprocessing {:.2} ms, ORT {:.2} ms, decode {:.2} ms, tracking {:.2} ms",
        self.frames,
        ms[0],
        ms[1],
        ms[2],
        ms[3],
        ms[4]
      );
      self.frames = 0;
      self.stages = [Duration::ZERO; 5];
      self.since = Instant::now();
    }
  }
}
