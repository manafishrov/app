use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;

use ruzstd::StreamingDecoder;

use super::constants::READ_BUFFER_SIZE;

pub trait ChunkSink {
  /// # Errors
  ///
  /// Returns an error if the sink cannot accept or persist the provided chunk.
  fn write_chunk(&mut self, chunk: &[u8]) -> Result<(), String>;
  fn on_progress(&mut self, bytes_read: u64, total_bytes: u64);
  fn cancelled(&self) -> bool;
}

/// # Errors
/// Returns an error if the source file cannot be opened or decoded, or if
/// the sink rejects a chunk.
pub fn stream_zstd<P: AsRef<Path>>(
  source: P,
  expected_size: u64,
  sink: &mut dyn ChunkSink,
) -> Result<u64, String> {
  let file = File::open(source.as_ref()).map_err(|e| e.to_string())?;
  let buffered = BufReader::with_capacity(READ_BUFFER_SIZE, file);
  let mut decoder = StreamingDecoder::new(buffered)
    .map_err(|e: ruzstd::frame_decoder::FrameDecoderError| e.to_string())?;
  let mut buffer = vec![0_u8; READ_BUFFER_SIZE];
  let mut bytes_total: u64 = 0;
  loop {
    if sink.cancelled() {
      return Err("Cancelled".to_string());
    }
    let read = decoder.read(&mut buffer).map_err(|e: std::io::Error| e.to_string())?;
    if read == 0 {
      break;
    }
    sink.write_chunk(&buffer[..read])?;
    bytes_total += u64::try_from(read).map_err(|e: std::num::TryFromIntError| e.to_string())?;
    sink.on_progress(bytes_total, expected_size);
  }
  Ok(bytes_total)
}

/// # Errors
/// Returns an error if the file cannot be opened or read.
pub fn stream_plain<P: AsRef<Path>>(
  source: P,
  expected_size: u64,
  sink: &mut dyn ChunkSink,
) -> Result<u64, String> {
  let file = File::open(source.as_ref()).map_err(|e| e.to_string())?;
  let mut buffered = BufReader::with_capacity(READ_BUFFER_SIZE, file);
  let mut buffer = vec![0_u8; READ_BUFFER_SIZE];
  let mut bytes_total: u64 = 0;
  loop {
    if sink.cancelled() {
      return Err("Cancelled".to_string());
    }
    let read = buffered.read(&mut buffer).map_err(|e| e.to_string())?;
    if read == 0 {
      break;
    }
    sink.write_chunk(&buffer[..read])?;
    bytes_total += u64::try_from(read).map_err(|e| e.to_string())?;
    sink.on_progress(bytes_total, expected_size);
  }
  Ok(bytes_total)
}
