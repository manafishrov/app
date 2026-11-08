//! Bounded binary RGBA transport from the `WebRTC` video element. All integers
//! are little endian. Canvas pixels already contain the model's letterbox.

use std::borrow::Cow;

pub const HEADER_BYTES: usize = 32;
pub const MAX_INPUT_SIZE: u32 = 1024;

pub struct MobileFrame {
  pub run_id: u32,
  pub source_width: u32,
  pub source_height: u32,
  pub input_width: u32,
  pub input_height: u32,
  pub captured_at: f64,
  packet: Vec<u8>,
}

impl MobileFrame {
  /// # Errors
  /// Rejects truncated, oversized, non-finite or inconsistent frame packets.
  pub fn parse<'a>(packet: impl Into<Cow<'a, [u8]>>) -> Result<Self, String> {
    let packet = packet.into();
    let mut frame = Self::validate_packet(&packet)?;
    // Tauri borrows the body: copy it only after validation. Tests and future
    // owned transports can transfer their allocation without another copy.
    frame.packet = packet.into_owned();
    Ok(frame)
  }

  /// # Errors
  /// Rejects truncated, oversized or inconsistent packets without copying them.
  fn validate_packet(packet: &[u8]) -> Result<Self, String> {
    if packet.len() < HEADER_BYTES {
      return Err("Truncated detection frame header".into());
    }
    let integer = |offset| {
      let mut bytes = [0; 4];
      bytes.copy_from_slice(&packet[offset..offset + 4]);
      u32::from_le_bytes(bytes)
    };
    let (source_width, source_height) = (integer(4), integer(8));
    let (input_width, input_height) = (integer(12), integer(16));
    let mut timestamp = [0; 8];
    timestamp.copy_from_slice(&packet[24..32]);
    let captured_at = f64::from_le_bytes(timestamp);
    if source_width == 0
      || source_height == 0
      || source_width > 16384
      || source_height > 16384
      || input_width == 0
      || input_height == 0
      || input_width > MAX_INPUT_SIZE
      || input_height > MAX_INPUT_SIZE
      || !captured_at.is_finite()
      || captured_at <= 0.0
    {
      return Err("Invalid detection frame dimensions or timestamp".into());
    }
    let size = input_width as usize * input_height as usize * 4;
    if packet.len() != HEADER_BYTES + size {
      return Err("Detection frame byte length does not match its dimensions".into());
    }
    Ok(Self {
      run_id: integer(0),
      source_width,
      source_height,
      input_width,
      input_height,
      captured_at,
      packet: Vec::new(),
    })
  }

  pub fn rgba(&self) -> &[u8] {
    &self.packet[HEADER_BYTES..]
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;

  fn packet() -> Vec<u8> {
    let mut packet = vec![0; HEADER_BYTES];
    for (index, value) in [7_u32, 1920, 1080, 1, 1].into_iter().enumerate() {
      packet[index * 4..index * 4 + 4].copy_from_slice(&value.to_le_bytes());
    }
    packet[24..32].copy_from_slice(&1234_f64.to_le_bytes());
    packet.extend([10, 20, 30, 255]);
    packet
  }

  #[test]
  fn binary_transport_preserves_source_dimensions_and_rgb() -> Result<(), String> {
    let frame = MobileFrame::parse(packet())?;
    assert_eq!((frame.source_width, frame.source_height), (1920, 1080));
    assert_eq!(frame.run_id, 7);
    assert_eq!(frame.rgba(), [10, 20, 30, 255]);
    let packet = packet();
    let pointer = packet.as_ptr();
    let frame = MobileFrame::parse(packet)?;
    assert_eq!(frame.rgba().as_ptr(), pointer.wrapping_add(HEADER_BYTES));
    assert_eq!(MobileFrame::parse(frame.packet.as_slice())?.rgba(), frame.rgba());
    Ok(())
  }

  #[test]
  fn rejects_bad_sizes_and_timestamps_before_allocating_pixels() {
    assert!(MobileFrame::parse(vec![]).is_err());
    let mut bytes = packet();
    bytes.pop();
    assert!(MobileFrame::parse(bytes).is_err());
    let mut bytes = packet();
    bytes[12..16].copy_from_slice(&u32::MAX.to_le_bytes());
    assert!(MobileFrame::parse(bytes).is_err());
    let mut bytes = packet();
    bytes[24..32].copy_from_slice(&f64::NAN.to_le_bytes());
    assert!(MobileFrame::parse(bytes).is_err());
  }
}
