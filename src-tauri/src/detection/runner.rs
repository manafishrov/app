//! Runs detection on the live stream and reports results to the frontend.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant, UNIX_EPOCH};

use ffmpeg_next as ffmpeg;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

use super::library;
use super::model::{DetectionModel, ExecutionProvider, ExecutionProviderPreference};
use super::postprocess::{DecodeOptions, Letterbox, decode};
use super::stream::{self, LatestFrame, StreamState};
use super::tracker::{Tracker, TrackerOptions};
use crate::log_warn;

/// Ultralytics' default for prediction.
const IOU_THRESHOLD: f32 = 0.7;
const MAX_DETECTIONS: usize = 300;
/// Detections between this and the user's threshold only continue existing
/// tracks; see `tracker`.
const LOW_CONFIDENCE_FLOOR: f32 = 0.1;
const STATS_INTERVAL: Duration = Duration::from_secs(1);

#[derive(Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DetectionOptions {
  pub model_id: String,
  pub execution_provider: ExecutionProviderPreference,
  pub confidence_threshold: f32,
  /// Class IDs to report; `None` reports every class.
  pub class_ids: Option<Vec<u32>>,
  pub stream_url: String,
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

pub struct DetectionRunner {
  model_id: String,
  stop: Arc<AtomicBool>,
  thread: Option<JoinHandle<()>>,
}

impl DetectionRunner {
  /// # Errors
  /// Returns an error if the worker thread cannot be created.
  pub fn start(options: DetectionOptions, events: Channel<DetectionEvent>) -> Result<Self, String> {
    let stop = Arc::new(AtomicBool::new(false));
    let model_id = options.model_id.clone();
    let thread = {
      let stop = Arc::clone(&stop);
      std::thread::Builder::new()
        .name("detection".to_string())
        .spawn(move || {
          let events = Events {
            channel: events,
            stop: Arc::clone(&stop),
          };
          run(&options, &stop, &events);
        })
        .map_err(|error| format!("Failed to start detection: {error}"))?
    };
    Ok(Self {
      model_id,
      stop,
      thread: Some(thread),
    })
  }

  pub fn model_id(&self) -> &str {
    &self.model_id
  }

  /// Signals the threads to stop and waits for them, so files they hold are
  /// released.
  pub fn stop_and_wait(mut self) {
    self.stop.store(true, Ordering::Relaxed);
    if let Some(thread) = self.thread.take() {
      let _ = thread.join();
    }
  }
}

impl Drop for DetectionRunner {
  fn drop(&mut self) {
    self.stop.store(true, Ordering::Relaxed);
  }
}

#[derive(Clone)]
struct Events {
  channel: Channel<DetectionEvent>,
  stop: Arc<AtomicBool>,
}

impl Events {
  fn send(&self, event: DetectionEvent) {
    if self.channel.send(event).is_err() {
      self.stop.store(true, Ordering::Relaxed);
    }
  }
}

fn send_status(
  events: &Events,
  state: DetectionState,
  message: Option<String>,
  execution_provider: Option<ExecutionProvider>,
) {
  events.send(DetectionEvent::Status {
    state,
    message,
    execution_provider,
  });
}

fn run(options: &DetectionOptions, stop: &Arc<AtomicBool>, events: &Events) {
  send_status(events, DetectionState::Loading, None, None);
  let loaded = library::model_path(&options.model_id)
    .and_then(|path| DetectionModel::load(&path, options.execution_provider));
  let (model, provider) = match loaded {
    Ok(loaded) => loaded,
    Err(error) => {
      log_warn!("Failed to load detection model: {error}");
      send_status(events, DetectionState::Error, Some(error), None);
      return;
    },
  };

  if stop.load(Ordering::Relaxed) {
    return;
  }
  let latest = Arc::new(LatestFrame::default());
  let reader = {
    let url = options.stream_url.clone();
    let stop = Arc::clone(stop);
    let latest = Arc::clone(&latest);
    let events = events.clone();
    let last_state = Mutex::new(None);
    std::thread::Builder::new().name("detection-stream".to_string()).spawn(move || {
      stream::run(&url, &stop, &latest, &|state, message| {
        let changed = last_state.lock().map_or(true, |mut last| last.replace(state) != Some(state));
        if !changed && message.is_none() {
          return;
        }
        let state = match state {
          StreamState::Connecting => DetectionState::Connecting,
          StreamState::Receiving => DetectionState::Running,
        };
        send_status(&events, state, message, Some(provider));
      });
    })
  };
  let reader = match reader {
    Ok(reader) => reader,
    Err(error) => {
      send_status(events, DetectionState::Error, Some(error.to_string()), Some(provider));
      return;
    },
  };

  infer(model, provider, options, stop, &latest, events);
  stop.store(true, Ordering::Relaxed);
  let _ = reader.join();
}

/// Converts decoded frames to RGB at the letterboxed size, rebuilt whenever
/// the stream's format or resolution changes.
struct Scaler {
  context: ffmpeg::software::scaling::Context,
  key: (ffmpeg::format::Pixel, u32, u32),
  output: ffmpeg::frame::Video,
}

impl Scaler {
  /// # Errors
  /// Returns an error if FFmpeg cannot convert the frame's pixel format.
  fn convert<'a>(
    scaler: &'a mut Option<Self>,
    frame: &ffmpeg::frame::Video,
    (scaled_width, scaled_height): (u32, u32),
  ) -> Result<&'a ffmpeg::frame::Video, String> {
    let key = (frame.format(), frame.width(), frame.height());
    if scaler.as_ref().is_none_or(|scaler| scaler.key != key) {
      let context = ffmpeg::software::scaling::Context::get(
        frame.format(),
        frame.width(),
        frame.height(),
        ffmpeg::format::Pixel::RGB24,
        scaled_width,
        scaled_height,
        ffmpeg::software::scaling::Flags::BILINEAR,
      )
      .map_err(|error| format!("Unsupported video format: {error}"))?;
      *scaler = Some(Self {
        context,
        key,
        output: ffmpeg::frame::Video::empty(),
      });
    }
    let scaler = scaler.as_mut().ok_or("Scaler missing")?;
    scaler
      .context
      .run(frame, &mut scaler.output)
      .map_err(|error| format!("Could not convert the frame: {error}"))?;
    Ok(&scaler.output)
  }
}

#[derive(Default)]
struct Stats {
  frames: u32,
  inference: Duration,
  latency: Duration,
  since: Option<Instant>,
}

impl Stats {
  fn record(&mut self, inference: Duration, latency: Duration, events: &Events) {
    let since = *self.since.get_or_insert_with(Instant::now);
    self.frames += 1;
    self.inference += inference;
    self.latency += latency;
    let elapsed = since.elapsed();
    if elapsed < STATS_INTERVAL {
      return;
    }
    let frames = self.frames as f32;
    events.send(DetectionEvent::Stats {
      inference_fps: frames / elapsed.as_secs_f32(),
      inference_ms: self.inference.as_secs_f32() * 1000.0 / frames,
      latency_ms: self.latency.as_secs_f32() * 1000.0 / frames,
    });
    *self = Self {
      since: Some(Instant::now()),
      ..Self::default()
    };
  }
}

fn infer(
  mut model: DetectionModel,
  provider: ExecutionProvider,
  options: &DetectionOptions,
  stop: &AtomicBool,
  latest: &LatestFrame,
  events: &Events,
) {
  let threshold = options.confidence_threshold.clamp(0.01, 1.0);
  let decode_options = DecodeOptions {
    min_confidence: threshold.min(LOW_CONFIDENCE_FLOOR),
    iou_threshold: IOU_THRESHOLD,
    max_detections: MAX_DETECTIONS,
    classes: options.class_ids.as_deref(),
  };
  let mut tracker = Tracker::new(TrackerOptions {
    high_confidence: threshold,
    match_iou: 0.2,
    low_match_iou: 0.5,
    max_missed_frames: 30,
    min_hits: 2,
  });
  let classes = model.description().classes.clone();
  let (input_width, input_height) =
    (model.description().input_width, model.description().input_height);
  let layout = model.layout();
  let mut scaler: Option<Scaler> = None;
  let mut stats = Stats::default();
  let mut last_error: Option<String> = None;

  while !stop.load(Ordering::Relaxed) {
    let Some(decoded) = latest.take(Duration::from_millis(200)) else {
      continue;
    };
    let started = Instant::now();
    let frame = &decoded.frame;
    let (width, height) = (frame.width(), frame.height());
    if width == 0 || height == 0 {
      continue;
    }
    let letterbox = Letterbox::fit(width, height, input_width, input_height);
    let (scaled_width, scaled_height) = letterbox.scaled_size();

    let output =
      Scaler::convert(&mut scaler, frame, (scaled_width, scaled_height)).and_then(|rgb| {
        #[allow(clippy::cast_sign_loss)] // Padding is never negative.
        let padding = (letterbox.pad_x as u32, letterbox.pad_y as u32);
        model
          .run(rgb.data(0), rgb.stride(0), scaled_width, scaled_height, padding.0, padding.1)
          .map_err(|error| format!("Inference failed: {error}"))
      });
    let output = match output {
      Ok(output) => output,
      Err(error) => {
        report_once(&mut last_error, events, error);
        continue;
      },
    };
    if last_error.take().is_some() {
      send_status(events, DetectionState::Running, None, Some(provider));
    }

    let found = decode(&output, layout, &letterbox, &decode_options);
    let detections = tracker
      .update(&found)
      .into_iter()
      .map(|tracked| {
        let [x1, y1, x2, y2] = tracked.detection.corners;
        let class_id = tracked.detection.class_id;
        Detection {
          track_id: tracked.track_id,
          class_id,
          label: classes
            .get(class_id as usize)
            .cloned()
            .unwrap_or_else(|| format!("Class {class_id}")),
          confidence: tracked.detection.confidence,
          left: x1,
          top: y1,
          width: x2 - x1,
          height: y2 - y1,
        }
      })
      .collect();

    let captured_at = decoded
      .captured_at
      .duration_since(UNIX_EPOCH)
      .map_or(0.0, |elapsed| elapsed.as_secs_f64() * 1000.0);
    events.send(DetectionEvent::Detections {
      captured_at,
      frame_width: width,
      frame_height: height,
      detections,
    });
    stats.record(started.elapsed(), decoded.decoded_at.elapsed(), events);
  }
}

/// Reports a per-frame error once instead of on every frame.
fn report_once(last_error: &mut Option<String>, events: &Events, message: String) {
  if last_error.as_deref() == Some(message.as_str()) {
    return;
  }
  log_warn!("Detection: {message}");
  events.send(DetectionEvent::Status {
    state: DetectionState::Error,
    message: Some(message.clone()),
    execution_provider: None,
  });
  *last_error = Some(message);
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use super::*;

  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS and MANA_FISH_TEST_IMAGE (Ultralytics bus.jpg)"]
  fn general_catalog_models_detect_and_track_objects_in_a_decoded_image() -> Result<(), String> {
    let models = std::env::var("MANA_FISH_TEST_MODELS").map_err(|error| error.to_string())?;
    let frame = test_image()?;
    for entry in super::super::catalog::list()? {
      if entry.experimental {
        continue;
      }
      let asset = entry.asset.ok_or("No model asset")?;
      let path = std::path::Path::new(&models).join(asset.file_name);
      let (mut model, provider) = DetectionModel::load(&path, ExecutionProviderPreference::Cpu)?;
      assert_eq!(provider, ExecutionProvider::Cpu);
      let description = model.description();
      let letterbox = Letterbox::fit(
        frame.width(),
        frame.height(),
        description.input_width,
        description.input_height,
      );
      let (width, height) = letterbox.scaled_size();
      let mut scaler = None;
      let rgb = Scaler::convert(&mut scaler, &frame, (width, height))?;
      #[allow(clippy::cast_sign_loss)]
      let output = model.run(
        rgb.data(0),
        rgb.stride(0),
        width,
        height,
        letterbox.pad_x as u32,
        letterbox.pad_y as u32,
      )?;
      let found = decode(
        &output,
        model.layout(),
        &letterbox,
        &DecodeOptions {
          min_confidence: 0.4,
          iou_threshold: IOU_THRESHOLD,
          max_detections: MAX_DETECTIONS,
          classes: None,
        },
      );
      for label in ["person", "bus"] {
        assert!(
          found
            .iter()
            .any(|item| model.description().classes[item.class_id as usize] == label),
          "{} did not detect {label}",
          entry.id
        );
      }
      for detection in &found {
        assert!(
          detection
            .corners
            .iter()
            .all(|value| value.is_finite() && (0.0..=1.0).contains(value))
        );
      }
      let mut tracker = Tracker::new(TrackerOptions {
        high_confidence: 0.4,
        match_iou: 0.2,
        low_match_iou: 0.5,
        max_missed_frames: 30,
        min_hits: 2,
      });
      assert_eq!(tracker.update(&found).len(), 0);
      let confirmed = tracker.update(&found);
      assert_eq!(confirmed.len(), found.len(), "{} confirmed tracks", entry.id);
      assert_eq!(
        tracker.update(&found).iter().map(|item| item.track_id).collect::<Vec<_>>(),
        confirmed.iter().map(|item| item.track_id).collect::<Vec<_>>()
      );
    }
    Ok(())
  }

  fn test_image() -> Result<ffmpeg::frame::Video, String> {
    let image = std::env::var("MANA_FISH_TEST_IMAGE").map_err(|error| error.to_string())?;
    ffmpeg::init().map_err(|error| error.to_string())?;
    let mut input = ffmpeg::format::input(&image).map_err(|error| error.to_string())?;
    let stream = input.streams().best(ffmpeg::media::Type::Video).ok_or("No image stream")?;
    let stream_index = stream.index();
    let mut decoder = ffmpeg::codec::context::Context::from_parameters(stream.parameters())
      .and_then(|context| context.decoder().video())
      .map_err(|error| error.to_string())?;
    let mut frame = ffmpeg::frame::Video::empty();
    for (stream, packet) in input.packets() {
      if stream.index() == stream_index {
        decoder.send_packet(&packet).map_err(|error| error.to_string())?;
        if decoder.receive_frame(&mut frame).is_ok() {
          break;
        }
      }
    }
    assert!(frame.width() > 0 && frame.height() > 0, "Image did not decode");
    Ok(frame)
  }

  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS, MANA_FISH_TEST_IMAGE, MANA_FISH_TEST_PROVIDER and GPU runtimes"]
  fn catalog_models_match_cpu_on_requested_gpu() -> Result<(), String> {
    use super::super::postprocess::OutputLayout;
    let models = std::env::var("MANA_FISH_TEST_MODELS").map_err(|error| error.to_string())?;
    let preference: ExecutionProviderPreference = serde_json::from_str(
      &serde_json::to_string(
        &std::env::var("MANA_FISH_TEST_PROVIDER").map_err(|error| error.to_string())?,
      )
      .map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    assert!(!matches!(
      preference,
      ExecutionProviderPreference::Auto | ExecutionProviderPreference::Cpu
    ));
    let frame = test_image()?;
    for entry in super::super::catalog::list()? {
      let asset = entry.asset.ok_or("No model asset")?;
      let path = std::path::Path::new(&models).join(asset.file_name);
      let (mut cpu, _) = DetectionModel::load(&path, ExecutionProviderPreference::Cpu)?;
      let (mut gpu, provider) = DetectionModel::load(&path, preference)?;
      assert_ne!(provider, ExecutionProvider::Cpu);
      let description = cpu.description();
      let letterbox = Letterbox::fit(
        frame.width(),
        frame.height(),
        description.input_width,
        description.input_height,
      );
      let (width, height) = letterbox.scaled_size();
      let mut scaler = None;
      let rgb = Scaler::convert(&mut scaler, &frame, (width, height))?;
      #[allow(clippy::cast_sign_loss)]
      let run = |model: &mut DetectionModel| {
        model.run(
          rgb.data(0),
          rgb.stride(0),
          width,
          height,
          letterbox.pad_x as u32,
          letterbox.pad_y as u32,
        )
      };
      let reference = run(&mut cpu)?;
      for _ in 0..2 {
        let actual = run(&mut gpu)?;
        assert_eq!(actual.len(), reference.len(), "{} output length", entry.id);
        assert!(actual.iter().all(|value| value.is_finite()), "{} finite output", entry.id);
        // End-to-end models reorder top-k rows when nearly tied low scores
        // differ. Compare their decoded detections instead of raw row order.
        if !matches!(cpu.layout(), OutputLayout::EndToEnd { .. }) {
          assert!(
            reference
              .iter()
              .zip(&actual)
              .all(|(a, b)| (a - b).abs() <= 0.05 + 0.001 * a.abs()),
            "{} raw output disagrees with CPU",
            entry.id
          );
        }
        let options = DecodeOptions {
          min_confidence: 0.25,
          iou_threshold: IOU_THRESHOLD,
          max_detections: MAX_DETECTIONS,
          classes: None,
        };
        let expected = decode(&reference, cpu.layout(), &letterbox, &options);
        let found = decode(&actual, gpu.layout(), &letterbox, &options);
        assert_eq!(found.len(), expected.len(), "{} detection count", entry.id);
        for item in &expected {
          assert!(
            found.iter().any(|other| item.class_id == other.class_id
              && (item.confidence - other.confidence).abs() < 0.015
              && item.corners.iter().zip(other.corners).all(|(a, b)| (a - b).abs() < 0.005)),
            "{} detection disagrees with CPU: {item:?}",
            entry.id
          );
        }
        if !entry.experimental {
          for label in ["person", "bus"] {
            assert!(
              found
                .iter()
                .any(|item| gpu.description().classes[item.class_id as usize] == label),
              "{} did not detect {label}",
              entry.id
            );
          }
        }
      }
      eprintln!("{}: {provider:?} agrees with CPU on two real-image runs", entry.id);
    }
    Ok(())
  }

  #[test]
  fn failed_channel_send_stops_the_worker() {
    let stop = Arc::new(AtomicBool::new(false));
    let events = Events {
      channel: Channel::new(|_| Err(std::io::Error::other("closed webview").into())),
      stop: Arc::clone(&stop),
    };
    send_status(&events, DetectionState::Running, None, None);
    assert!(stop.load(Ordering::Relaxed));
  }

  #[test]
  fn stopping_waits_until_the_worker_releases_its_resources() {
    let stop = Arc::new(AtomicBool::new(false));
    let released = Arc::new(AtomicBool::new(false));
    let thread = {
      let stop = Arc::clone(&stop);
      let released = Arc::clone(&released);
      std::thread::spawn(move || {
        while !stop.load(Ordering::Relaxed) {
          std::thread::yield_now();
        }
        released.store(true, Ordering::Relaxed);
      })
    };
    DetectionRunner {
      model_id: "test".to_string(),
      stop,
      thread: Some(thread),
    }
    .stop_and_wait();
    assert!(released.load(Ordering::Relaxed));
  }
}
