//! Reads the ROV camera over RTSP and keeps only the newest decoded frame.
//!
//! go2rtc forwards the camera's H.264 without re-encoding, so this is a second
//! copy of the stream the webview shows over `WebRTC`. Inference takes whatever
//! frame is newest when it is ready, so a slow model drops frames instead of
//! falling behind.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::{Duration, Instant, SystemTime};

use ffmpeg_next as ffmpeg;

const OPEN_TIMEOUT: Duration = Duration::from_secs(5);
/// No decoded frames for this long means the stream is gone, even if the socket is
/// still open.
const READ_TIMEOUT: Duration = Duration::from_secs(3);

pub struct DecodedFrame {
  pub frame: ffmpeg::frame::Video,
  /// When the frame finished decoding, as wall-clock time for the frontend.
  pub captured_at: SystemTime,
  pub decoded_at: Instant,
}

/// Single-slot handoff between the reader thread and the inference thread.
#[derive(Default)]
pub struct LatestFrame {
  slot: Mutex<Option<DecodedFrame>>,
  ready: Condvar,
}

impl LatestFrame {
  fn put(&self, frame: DecodedFrame) {
    if let Ok(mut slot) = self.slot.lock() {
      *slot = Some(frame);
      self.ready.notify_one();
    }
  }

  /// Waits up to `timeout` for a frame newer than the last one taken.
  pub fn take(&self, timeout: Duration) -> Option<DecodedFrame> {
    let slot = self.slot.lock().ok()?;
    let (mut slot, _) = self.ready.wait_timeout_while(slot, timeout, |slot| slot.is_none()).ok()?;
    slot.take()
  }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum StreamState {
  Connecting,
  Receiving,
}

/// Connects to `url` and decodes frames into `latest` until `stop` is set,
/// reconnecting whenever the stream drops.
pub fn run(
  url: &str,
  stop: &Arc<AtomicBool>,
  latest: &LatestFrame,
  on_state: &dyn Fn(StreamState, Option<String>),
) {
  const RETRY_DELAY: Duration = Duration::from_secs(2);

  if let Err(error) = ffmpeg::init() {
    on_state(StreamState::Connecting, Some(format!("Failed to initialize FFmpeg: {error}")));
    return;
  }
  while !stop.load(Ordering::Relaxed) {
    on_state(StreamState::Connecting, None);
    let result = read_stream(url, stop, latest, || on_state(StreamState::Receiving, None));
    if stop.load(Ordering::Relaxed) {
      break;
    }
    if let Err(error) = result {
      on_state(StreamState::Connecting, Some(error));
    }
    let retry_at = Instant::now() + RETRY_DELAY;
    while Instant::now() < retry_at && !stop.load(Ordering::Relaxed) {
      std::thread::sleep(Duration::from_millis(100));
    }
  }
}

/// # Errors
/// Returns an error if the stream cannot be opened or decoded, or ends.
fn read_stream(
  url: &str,
  stop: &Arc<AtomicBool>,
  latest: &LatestFrame,
  on_receiving: impl Fn(),
) -> Result<(), String> {
  // The interrupt callback is the only way to abort a blocking FFmpeg read,
  // both for stopping and for a stream that silently stops sending.
  let last_activity = Arc::new(Mutex::new((Instant::now(), OPEN_TIMEOUT)));
  let interrupt = {
    let stop = Arc::clone(stop);
    let last_activity = Arc::clone(&last_activity);
    move || {
      stop.load(Ordering::Relaxed)
        || last_activity.lock().map_or(true, |activity| activity.0.elapsed() > activity.1)
    }
  };
  let touch = || {
    if let Ok(mut last) = last_activity.lock() {
      *last = (Instant::now(), READ_TIMEOUT);
    }
  };

  let mut options = ffmpeg::Dictionary::new();
  options.set("rtsp_transport", "tcp");
  options.set("fflags", "nobuffer");
  options.set("flags", "low_delay");
  options.set("max_delay", "0");
  options.set("reorder_queue_size", "0");
  options.set("analyzeduration", "500000");
  options.set("timeout", &OPEN_TIMEOUT.as_micros().to_string());
  let mut input = ffmpeg::format::input_with_interrupt_and_dictionary(url, interrupt, options)
    .map_err(|error| format!("Could not open {url}: {error}"))?;
  touch();

  let stream = input
    .streams()
    .best(ffmpeg::media::Type::Video)
    .ok_or_else(|| "The stream has no video track".to_string())?;
  let stream_index = stream.index();
  let mut context = ffmpeg::codec::context::Context::from_parameters(stream.parameters())
    .map_err(|error| error.to_string())?;
  context.set_flags(ffmpeg::codec::Flags::LOW_DELAY);
  // Frame threading buffers one frame per thread; slice threading adds no
  // latency.
  context.set_threading(ffmpeg::codec::threading::Config {
    kind: ffmpeg::codec::threading::Type::Slice,
    ..Default::default()
  });
  let mut decoder = context.decoder().video().map_err(|error| error.to_string())?;

  let mut receiving = false;
  for (packet_stream, packet) in input.packets() {
    if stop.load(Ordering::Relaxed) {
      return Ok(());
    }
    if packet_stream.index() != stream_index {
      continue;
    }
    if decoder.send_packet(&packet).is_err() {
      continue;
    }
    let mut frame = ffmpeg::frame::Video::empty();
    while decoder.receive_frame(&mut frame).is_ok() {
      touch();
      if !receiving {
        receiving = true;
        on_receiving();
      }
      latest.put(DecodedFrame {
        frame,
        captured_at: SystemTime::now(),
        decoded_at: Instant::now(),
      });
      frame = ffmpeg::frame::Video::empty();
    }
  }
  if stop.load(Ordering::Relaxed) {
    Ok(())
  } else {
    Err("The stream ended".to_string())
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use std::net::TcpListener;
  use std::sync::mpsc;

  use super::*;

  #[test]
  fn stop_interrupts_a_server_that_accepts_but_never_answers()
  -> Result<(), Box<dyn std::error::Error>> {
    ffmpeg::init()?;
    let listener = TcpListener::bind("127.0.0.1:0")?;
    let url = format!("rtsp://{}/cam", listener.local_addr()?);
    let (accepted_tx, accepted_rx) = mpsc::channel();
    let (release_tx, release_rx) = mpsc::channel();
    let server = std::thread::spawn(move || {
      if let Ok((socket, _)) = listener.accept() {
        let _ = accepted_tx.send(());
        let _ = release_rx.recv_timeout(OPEN_TIMEOUT + READ_TIMEOUT);
        drop(socket);
      }
    });
    let stop = Arc::new(AtomicBool::new(false));
    let (finished_tx, finished_rx) = mpsc::channel();
    let reader = {
      let stop = Arc::clone(&stop);
      std::thread::spawn(move || {
        let result = read_stream(&url, &stop, &LatestFrame::default(), || {});
        let _ = finished_tx.send(result);
      })
    };
    accepted_rx.recv_timeout(OPEN_TIMEOUT)?;
    stop.store(true, Ordering::Relaxed);
    let finished = finished_rx.recv_timeout(Duration::from_secs(2));
    release_tx.send(())?;
    assert!(server.join().is_ok());
    assert!(reader.join().is_ok());
    assert!(finished.is_ok(), "FFmpeg did not stop promptly: {finished:?}");
    Ok(())
  }
}
