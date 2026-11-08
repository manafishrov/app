//! Mobile inference uses pixels from the playing `WebRTC` video, without a
//! second decoder or stream connection. A request completes after inference;
//! the frontend samples the newest video frame only after that acknowledgement.

#![cfg_attr(desktop, allow(dead_code))] // The mobile implementation is also compiled by host tests.

use std::sync::{
  Arc,
  atomic::{AtomicBool, Ordering},
  mpsc,
};
use std::thread::JoinHandle;
use std::time::{Duration, Instant};

use tauri::ipc::Channel;
use tokio::sync::oneshot;

use super::diagnostics::Diagnostics;
pub use super::events::*;
use super::library;
use super::mobile_frame::MobileFrame;
use super::model::{DetectionModel, ExecutionProvider};
use super::postprocess::{Letterbox, decode};
use super::settings::{DetectionSettings, LiveSettings};
use super::tracker::Tracker;

struct Request {
  frame: MobileFrame,
  done: oneshot::Sender<Result<(), String>>,
  received_at: Instant,
}

pub struct DetectionRunner {
  model_id: String,
  settings: LiveSettings,

  run_id: u32,
  stop: Arc<AtomicBool>,
  frames: mpsc::SyncSender<Request>,
  thread: Option<JoinHandle<()>>,
}

impl DetectionRunner {
  /// # Errors
  /// Returns an error if the inference thread cannot start.
  pub fn start(options: DetectionOptions, events: Channel<DetectionEvent>) -> Result<Self, String> {
    let mut initial = DetectionSettings::from_options(&options);
    initial.validate()?;
    let settings = Arc::new(std::sync::Mutex::new(initial));
    let run_id = options.run_id;
    let stop = Arc::new(AtomicBool::new(false));
    let (frames, receiver) = mpsc::sync_channel(1);
    let model_id = options.model_id.clone();
    let thread_settings = Arc::clone(&settings);
    let thread_stop = Arc::clone(&stop);
    let thread = std::thread::Builder::new()
      .name("detection".into())
      .spawn(move || {
        let send = |event| {
          if !thread_stop.load(Ordering::Relaxed) && events.send(event).is_err() {
            thread_stop.store(true, Ordering::Relaxed);
          }
        };
        let status = |state, message, provider| {
          send(DetectionEvent::Status {
            state,
            message,
            execution_provider: provider,
          });
        };
        status(DetectionState::Loading, None, None);
        let result = library::model_path(&options.model_id)
          .and_then(|path| DetectionModel::load(&path, options.execution_provider))
          .and_then(|(model, provider)| {
            status(DetectionState::Connecting, None, Some(provider));
            infer(model, provider, &thread_settings, &thread_stop, &receiver, &send)
          });
        if let Err(error) = result {
          status(DetectionState::Error, Some(error), None);
        }
        // Dropping the receiver releases any pending IPC acknowledgement.
      })
      .map_err(|error| error.to_string())?;
    Ok(Self {
      model_id,
      settings,
      run_id,
      stop,
      frames,
      thread: Some(thread),
    })
  }

  /// # Errors
  /// Rejects updates for stopped or superseded runs.
  pub fn update_settings(
    &self,
    run_id: u32,
    mut settings: DetectionSettings,
  ) -> Result<(), String> {
    settings.validate()?;
    if run_id != self.run_id || self.stop.load(Ordering::Relaxed) {
      return Err("Detection session has stopped".into());
    }
    *self.settings.lock().map_err(|error| error.to_string())? = settings;
    Ok(())
  }

  pub fn model_id(&self) -> &str {
    &self.model_id
  }

  pub fn request_stop(&self) {
    self.stop.store(true, Ordering::Relaxed);
  }

  /// # Errors
  /// Rejects stale sessions, stopped workers and overlapping frame requests.
  pub fn submit(
    &self,
    frame: MobileFrame,
  ) -> Result<oneshot::Receiver<Result<(), String>>, String> {
    if frame.run_id != self.run_id || self.stop.load(Ordering::Relaxed) {
      return Err("Detection capture session has stopped".into());
    }
    let (done, receiver) = oneshot::channel();
    self
      .frames
      .try_send(Request {
        frame,
        done,
        received_at: Instant::now(),
      })
      .map_err(|_| "Detection worker is busy or stopped".to_string())?;
    Ok(receiver)
  }

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

/// # Errors
/// Returns inference errors and expires sessions whose capture source disappeared.
fn infer(
  mut model: DetectionModel,
  provider: ExecutionProvider,
  settings: &LiveSettings,
  stop: &AtomicBool,
  frames: &mpsc::Receiver<Request>,
  send: &impl Fn(DetectionEvent),
) -> Result<(), String> {
  let mut tracker = settings.lock().unwrap_or_else(std::sync::PoisonError::into_inner).tracker();
  let mut diagnostics = Diagnostics::default();
  let mut last_frame = Instant::now();
  let mut previous_size = (0, 0);
  let mut running = false;
  let mut last_result = Instant::now();
  while !stop.load(Ordering::Relaxed) {
    let request = match frames.recv_timeout(Duration::from_millis(100)) {
      Ok(request) => request,
      Err(mpsc::RecvTimeoutError::Disconnected) => break,
      Err(mpsc::RecvTimeoutError::Timeout) => {
        // Also release the model if a suspended webview never delivers its stop IPC.
        if last_frame.elapsed() > Duration::from_secs(10) {
          return Err("No video frames received for 10 seconds. Toggle detection to retry.".into());
        }
        continue;
      },
    };
    last_frame = Instant::now();
    let frame = request.frame;
    let description = model.description();
    if (frame.input_width, frame.input_height)
      != (description.input_width, description.input_height)
    {
      let _ = request
        .done
        .send(Err("Capture dimensions do not match the loaded model".into()));
      continue;
    }
    let size = (frame.source_width, frame.source_height);
    if size != previous_size {
      tracker = settings.lock().unwrap_or_else(std::sync::PoisonError::into_inner).tracker();
      previous_size = size;
    }
    let queue = request.received_at.elapsed();
    let started = Instant::now();
    let letterbox = Letterbox::fit(size.0, size.1, frame.input_width, frame.input_height);
    let layout = model.layout();
    let mut frame_settings = None;
    let result = model.run_rgba_with(frame.rgba(), |output| {
      let settings = settings.lock().unwrap_or_else(std::sync::PoisonError::into_inner);
      tracker.configure(settings.confidence_threshold, settings.class_ids.as_deref());
      let found = decode(output, layout, &letterbox, &settings.decoder());
      frame_settings = Some(settings);
      found
    });
    let output = match result {
      Ok(output) => output,
      Err(error) => {
        let _ = request.done.send(Err(error.clone()));
        return Err(error);
      },
    };
    if stop.load(Ordering::Relaxed) {
      break;
    }
    if !running {
      send(DetectionEvent::Status {
        state: DetectionState::Running,
        message: None,
        execution_provider: Some(provider),
      });
      running = true;
    }
    let found = output;
    let tracking = Instant::now();
    let detections = tracked_detections(&mut tracker, &found, model.description());
    diagnostics.record(queue, model.timings(), tracking.elapsed());
    send(DetectionEvent::Detections {
      captured_at: frame.captured_at,
      frame_width: size.0,
      frame_height: size.1,
      detections,
    });
    drop(frame_settings);
    send_stats(started, &mut last_result, frame.captured_at, send);
    let _ = request.done.send(Ok(()));
  }
  Ok(())
}

fn send_stats(
  started: Instant,
  last_result: &mut Instant,
  captured_at: f64,
  send: &impl Fn(DetectionEvent),
) {
  let inference_ms = started.elapsed().as_secs_f32() * 1000.0;
  let elapsed = last_result.elapsed().as_secs_f32();
  *last_result = Instant::now();
  let now = std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .map_or(captured_at, |time| time.as_secs_f64() * 1000.0);
  send(DetectionEvent::Stats {
    inference_fps: 1.0 / elapsed.max(0.001),
    inference_ms,
    latency_ms: (now - captured_at).max(0.0) as f32,
  });
}

fn tracked_detections(
  tracker: &mut Tracker,
  found: &[super::postprocess::RawDetection],
  description: &super::model::ModelDescription,
) -> Vec<Detection> {
  tracker
    .update(found)
    .into_iter()
    .map(|tracked| {
      let [x1, y1, x2, y2] = tracked.detection.corners;
      let class_id = tracked.detection.class_id;
      Detection {
        track_id: tracked.track_id,
        class_id,
        label: description
          .classes
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
    .collect()
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_errors_doc, clippy::missing_panics_doc)]
  use super::*;

  fn frame(run_id: u32) -> MobileFrame {
    let mut packet = vec![0; super::super::mobile_frame::HEADER_BYTES];
    for (index, value) in [run_id, 1920, 1080, 1, 1].into_iter().enumerate() {
      packet[index * 4..index * 4 + 4].copy_from_slice(&value.to_le_bytes());
    }
    packet[24..32].copy_from_slice(&1234_f64.to_le_bytes());
    packet.extend([114, 114, 114, 255]);
    MobileFrame::parse(packet).unwrap()
  }

  #[test]
  fn queue_is_bounded_and_rejects_previous_sessions() {
    let (frames, receiver) = mpsc::sync_channel(1);
    let runner = DetectionRunner {
      model_id: "test".into(),
      settings: Arc::new(std::sync::Mutex::new(DetectionSettings {
        confidence_threshold: 0.4,
        class_ids: None,
      })),
      run_id: 7,
      stop: Arc::new(AtomicBool::new(false)),
      frames,
      thread: None,
    };
    assert!(
      runner
        .update_settings(
          6,
          DetectionSettings {
            confidence_threshold: 0.8,
            class_ids: None
          }
        )
        .is_err()
    );
    runner
      .update_settings(
        7,
        DetectionSettings {
          confidence_threshold: 0.8,
          class_ids: Some(vec![]),
        },
      )
      .unwrap();
    assert_eq!(runner.settings.lock().unwrap().confidence_threshold, 0.8);
    assert!(runner.submit(frame(6)).is_err());
    let completion = runner.submit(frame(7)).unwrap();
    assert!(runner.submit(frame(7)).is_err());
    drop(receiver);
    assert!(completion.blocking_recv().is_err());
    runner.request_stop();
    assert!(
      runner
        .update_settings(
          7,
          DetectionSettings {
            confidence_threshold: 0.4,
            class_ids: None
          }
        )
        .is_err()
    );
    assert!(runner.submit(frame(7)).is_err());
    runner.stop_and_wait();
  }

  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS and MANA_FISH_TEST_RGB (letterboxed RGB24 bus image)"]
  fn mobile_frames_run_real_catalog_models_and_release_pending_ipc() -> Result<(), String> {
    use super::super::model::ExecutionProviderPreference;
    let directory = std::path::PathBuf::from(
      std::env::var("MANA_FISH_TEST_MODELS").map_err(|error| error.to_string())?,
    );
    let rgb =
      std::fs::read(std::env::var("MANA_FISH_TEST_RGB").map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    for entry in super::super::catalog::list()? {
      let path = directory.join(entry.asset.ok_or("Missing asset")?.file_name);
      let (model, provider) = DetectionModel::load(&path, ExecutionProviderPreference::Cpu)?;
      let (width, height) = (model.description().input_width, model.description().input_height);
      let stop = Arc::new(AtomicBool::new(false));
      let (sender, frames) = mpsc::sync_channel(6);
      assert_eq!(rgb.len(), width as usize * height as usize * 3);
      let mut completions = Vec::new();
      for _ in 0..6 {
        let (done, completion) = oneshot::channel();
        completions.push(completion);
        let rgba: Vec<u8> = rgb
          .as_chunks::<3>()
          .0
          .iter()
          .flat_map(|pixel| [pixel[0], pixel[1], pixel[2], 255])
          .collect();
        let mut packet = vec![0; 32];
        for (index, value) in [7_u32, 810, 1080, width, height].into_iter().enumerate() {
          packet[index * 4..index * 4 + 4].copy_from_slice(&value.to_le_bytes());
        }
        packet[24..32].copy_from_slice(&1234_f64.to_le_bytes());
        packet.extend(rgba);
        let input = MobileFrame::parse(packet)?;
        sender
          .send(Request {
            frame: input,
            done,
            received_at: Instant::now(),
          })
          .map_err(|error| error.to_string())?;
      }
      let options = DetectionOptions {
        model_id: entry.id,
        execution_provider: ExecutionProviderPreference::Cpu,
        confidence_threshold: 0.4,
        class_ids: None,
        stream_url: String::new(),
        run_id: 7,
      };
      let settings = Arc::new(std::sync::Mutex::new(DetectionSettings::from_options(&options)));
      let received = std::sync::Mutex::new(Vec::new());
      let frame_count = std::cell::Cell::new(0);
      infer(model, provider, &settings, &stop, &frames, &|event| {
        if matches!(event, DetectionEvent::Detections { .. }) {
          frame_count.set(frame_count.get() + 1);
          stop.store(frame_count.get() == 6, Ordering::Relaxed);
          if matches!(frame_count.get(), 3..=5) {
            assert!(
              matches!(&event, DetectionEvent::Detections { detections, .. } if detections.is_empty())
            );
          }
        }
        // Stats follow publication after the settings guard is released.
        if matches!(event, DetectionEvent::Stats { .. }) {
          if frame_count.get() == 2 {
            settings.lock().unwrap().class_ids = Some(vec![]);
          }
          if frame_count.get() == 3 {
            *settings.lock().unwrap() = DetectionSettings {
              confidence_threshold: 1.0,
              class_ids: None,
            };
          }
          if frame_count.get() == 4 {
            settings.lock().unwrap().confidence_threshold = 0.4;
          }
        }
        received.lock().unwrap().push(event);
      })?;
      for completion in completions {
        completion.blocking_recv().map_err(|error| error.to_string())??;
      }
      assert!(received.lock().unwrap().iter().any(|event| matches!(
        event,
        DetectionEvent::Detections {
          frame_width: 810,
          frame_height: 1080,
          ..
        }
      )));
      assert_eq!(frame_count.get(), 6);
      if !entry.experimental {
        assert!(
          matches!(received.lock().unwrap().iter().rev().find(|e| matches!(e, DetectionEvent::Detections { .. })), Some(DetectionEvent::Detections { detections, .. }) if !detections.is_empty())
        );
        for label in ["person", "bus"] {
          assert!(received.lock().unwrap().iter().any(|event| matches!(event,
            DetectionEvent::Detections { detections, .. } if detections.iter().any(|d| d.label == label))),
            "{} mobile frame did not detect {label}", options.model_id);
        }
      }
    }
    Ok(())
  }
}
