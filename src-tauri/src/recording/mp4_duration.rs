//! Writes the real duration into fragmented MP4 recordings. `WebView`
//! `MediaRecorder` leaves the header duration at zero and lists every sample in
//! `moof` fragments, so players that trust the header show a wrong length.
//! Only the `moov` header changes; media data is copied byte for byte.
#![allow(
  clippy::similar_names,
  reason = "MP4 box names such as mvhd, mdhd and mehd differ by one letter"
)]

use std::fs::{self, File};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::ops::Range;
use std::path::Path;

const TFHD_BASE_DATA_OFFSET: u32 = 0x00_0001;
const TFHD_SAMPLE_DESCRIPTION_INDEX: u32 = 0x00_0002;
const TFHD_DEFAULT_SAMPLE_DURATION: u32 = 0x00_0008;
const TRUN_DATA_OFFSET: u32 = 0x00_0001;
const TRUN_FIRST_SAMPLE_FLAGS: u32 = 0x00_0004;
const TRUN_SAMPLE_DURATION: u32 = 0x00_0100;
const TRUN_SAMPLE_SIZE: u32 = 0x00_0200;
const TRUN_SAMPLE_FLAGS: u32 = 0x00_0400;
const TRUN_SAMPLE_COMPOSITION_OFFSET: u32 = 0x00_0800;
/// Header boxes are read into memory; media data is only ever streamed.
const MAX_HEADER_BOX_BYTES: u64 = 64 << 20;
const TRUNCATED: &str = "Truncated MP4 box";

#[derive(Clone, Copy)]
struct Mp4Box {
  kind: [u8; 4],
  start: usize,
  header: usize,
  end: usize,
}

impl Mp4Box {
  fn body(&self) -> Range<usize> {
    self.start + self.header..self.end
  }
}

struct Track {
  id: u32,
  timescale: u32,
  default_sample_duration: u32,
  /// Decode time after the latest fragment, for fragments without `tfdt`.
  next_time: u64,
  duration: u64,
}

struct Movie {
  timescale: u32,
  tracks: Vec<Track>,
  /// Set when inserting bytes into `moov` would break absolute file offsets.
  absolute_offsets: bool,
}

fn read_u32(bytes: &[u8], offset: usize) -> Option<u32> {
  Some(u32::from_be_bytes(bytes.get(offset..offset + 4)?.try_into().ok()?))
}

fn read_u64(bytes: &[u8], offset: usize) -> Option<u64> {
  Some(u64::from_be_bytes(bytes.get(offset..offset + 8)?.try_into().ok()?))
}

/// Writes `value` at `offset`.
/// # Errors
/// Returns an error if the field is outside `bytes`.
fn write_bytes(bytes: &mut [u8], offset: usize, value: &[u8]) -> Result<(), String> {
  bytes
    .get_mut(offset..offset + value.len())
    .ok_or(TRUNCATED)?
    .copy_from_slice(value);
  Ok(())
}

/// Writes a version 0 (32-bit) or version 1 (64-bit) duration field.
/// # Errors
/// Returns an error if the field is truncated or the value does not fit.
fn write_duration_field(
  bytes: &mut [u8],
  version: u8,
  offset: usize,
  value: u64,
) -> Result<(), String> {
  if version == 1 {
    write_bytes(bytes, offset, &value.to_be_bytes())
  } else {
    let value = u32::try_from(value).map_err(|_| "Duration does not fit the MP4 box")?;
    write_bytes(bytes, offset, &value.to_be_bytes())
  }
}

/// Parses a box header from `head`, the bytes at its start, with `available`
/// bytes left in the parent. Returns the type, header length and box size.
/// # Errors
/// Returns an error if the header is truncated or the size is out of bounds.
fn parse_header(head: &[u8], available: u64) -> Result<([u8; 4], u64, u64), String> {
  let size = read_u32(head, 0).ok_or(TRUNCATED)?;
  let kind: [u8; 4] = head.get(4..8).and_then(|kind| kind.try_into().ok()).ok_or(TRUNCATED)?;
  let (header, size) = match size {
    0 => (8, available),
    1 => (16, read_u64(head, 8).ok_or(TRUNCATED)?),
    size => (8, u64::from(size)),
  };
  if size < header || size > available {
    return Err(format!("Invalid size for MP4 box {}", String::from_utf8_lossy(&kind)));
  }
  Ok((kind, header, size))
}

/// Boxes inside `range` of `bytes`.
/// # Errors
/// Returns an error if a box header is invalid.
fn children(bytes: &[u8], range: Range<usize>) -> Result<Vec<Mp4Box>, String> {
  let mut boxes = Vec::new();
  let mut offset = range.start;
  // Some writers pad containers with a few zero bytes, too short for a box.
  while range.end.saturating_sub(offset) >= 8 {
    let available = (range.end - offset) as u64;
    let (kind, header, size) = parse_header(&bytes[offset..range.end], available)?;
    let end = offset + size as usize;
    boxes.push(Mp4Box {
      kind,
      start: offset,
      header: header as usize,
      end,
    });
    offset = end;
  }
  Ok(boxes)
}

/// The first box in `bytes`, which holds exactly one box.
/// # Errors
/// Returns an error if the box header is invalid or missing.
fn root(bytes: &[u8]) -> Result<Mp4Box, String> {
  children(bytes, 0..bytes.len())?
    .into_iter()
    .next()
    .ok_or_else(|| TRUNCATED.into())
}

/// The first child of `parent` with type `kind`, if any.
/// # Errors
/// Returns an error if a box header in `parent` is invalid.
fn child(bytes: &[u8], parent: &Mp4Box, kind: [u8; 4]) -> Result<Option<Mp4Box>, String> {
  Ok(children(bytes, parent.body())?.into_iter().find(|found| found.kind == kind))
}

/// The first child of `parent` with type `kind`.
/// # Errors
/// Returns an error if a box header is invalid or the child is missing.
fn required_child(bytes: &[u8], parent: &Mp4Box, kind: [u8; 4]) -> Result<Mp4Box, String> {
  child(bytes, parent, kind)?
    .ok_or_else(|| format!("MP4 box {} is missing", String::from_utf8_lossy(&kind)))
}

/// Reads a field at `offset` bytes into the body of `full_box`, after its
/// version and flags.
/// # Errors
/// Returns an error if the box is truncated.
fn field_u32(bytes: &[u8], full_box: &Mp4Box, offset: usize) -> Result<u32, String> {
  read_u32(bytes, full_box.body().start + 4 + offset).ok_or_else(|| TRUNCATED.into())
}

/// Version and flags of a full box.
/// # Errors
/// Returns an error if the box is truncated.
fn version_and_flags(bytes: &[u8], full_box: &Mp4Box) -> Result<(u8, u32), String> {
  let word = read_u32(bytes, full_box.body().start).ok_or(TRUNCATED)?;
  Ok(((word >> 24) as u8, word & 0x00FF_FFFF))
}

/// Version and duration field offset of `mvhd` or `mdhd`, which share a
/// layout: creation and modification times, timescale, then duration.
/// # Errors
/// Returns an error if the box is truncated.
fn header_duration(bytes: &[u8], header_box: &Mp4Box) -> Result<(u8, usize), String> {
  let (version, _) = version_and_flags(bytes, header_box)?;
  let offset = header_box.body().start + if version == 1 { 24 } else { 16 };
  Ok((version, offset))
}

/// Version and offset of the track ID in `tkhd`; the duration follows a
/// reserved field after it.
/// # Errors
/// Returns an error if the box is truncated.
fn track_id_offset(bytes: &[u8], tkhd: &Mp4Box) -> Result<(u8, usize), String> {
  let (version, _) = version_and_flags(bytes, tkhd)?;
  Ok((version, tkhd.body().start + if version == 1 { 20 } else { 12 }))
}

/// Whether a track's sample table points at absolute file offsets.
/// # Errors
/// Returns an error if a box header is invalid.
fn has_chunk_offsets(bytes: &[u8], trak: &Mp4Box) -> Result<bool, String> {
  let mut parent = *trak;
  for kind in [*b"mdia", *b"minf", *b"stbl"] {
    let Some(found) = child(bytes, &parent, kind)? else {
      return Ok(false);
    };
    parent = found;
  }
  for table in children(bytes, parent.body())? {
    if (table.kind == *b"stco" || table.kind == *b"co64") && field_u32(bytes, &table, 0)? > 0 {
      return Ok(true);
    }
  }
  Ok(false)
}

/// Reads the movie timescale and the tracks from `moov`.
/// # Errors
/// Returns an error if `moov` is malformed or has no tracks.
fn read_movie(moov_bytes: &[u8]) -> Result<Movie, String> {
  let moov = root(moov_bytes)?;
  let (_, mvhd_duration) =
    header_duration(moov_bytes, &required_child(moov_bytes, &moov, *b"mvhd")?)?;
  let mut movie = Movie {
    timescale: read_u32(moov_bytes, mvhd_duration - 4).ok_or(TRUNCATED)?,
    tracks: Vec::new(),
    absolute_offsets: false,
  };
  let mut trex_defaults = Vec::new();
  for item in children(moov_bytes, moov.body())? {
    if item.kind == *b"trak" {
      let (_, id_offset) =
        track_id_offset(moov_bytes, &required_child(moov_bytes, &item, *b"tkhd")?)?;
      let mdia = required_child(moov_bytes, &item, *b"mdia")?;
      let (_, mdhd_duration) =
        header_duration(moov_bytes, &required_child(moov_bytes, &mdia, *b"mdhd")?)?;
      movie.absolute_offsets |= has_chunk_offsets(moov_bytes, &item)?;
      movie.tracks.push(Track {
        id: read_u32(moov_bytes, id_offset).ok_or(TRUNCATED)?,
        timescale: read_u32(moov_bytes, mdhd_duration - 4).ok_or(TRUNCATED)?,
        default_sample_duration: 0,
        next_time: 0,
        duration: 0,
      });
    } else if item.kind == *b"mvex" {
      for trex in children(moov_bytes, item.body())? {
        if trex.kind == *b"trex" {
          trex_defaults.push((field_u32(moov_bytes, &trex, 0)?, field_u32(moov_bytes, &trex, 8)?));
        }
      }
    }
  }
  for (id, default_sample_duration) in trex_defaults {
    if let Some(track) = movie.tracks.iter_mut().find(|track| track.id == id) {
      track.default_sample_duration = default_sample_duration;
    }
  }
  if movie.timescale == 0 || movie.tracks.is_empty() {
    return Err("MP4 header has no timescale or tracks".into());
  }
  Ok(movie)
}

/// End decode time of the samples in `trun`, starting at `time`.
/// # Errors
/// Returns an error if the box is truncated.
fn trun_end(bytes: &[u8], trun: &Mp4Box, default_duration: u32, time: u64) -> Result<u64, String> {
  let (_, flags) = version_and_flags(bytes, trun)?;
  let sample_count = field_u32(bytes, trun, 0)?;
  let mut offset = trun.body().start + 8;
  for flag in [TRUN_DATA_OFFSET, TRUN_FIRST_SAMPLE_FLAGS] {
    if flags & flag != 0 {
      offset += 4;
    }
  }
  let sample_fields = [
    TRUN_SAMPLE_DURATION,
    TRUN_SAMPLE_SIZE,
    TRUN_SAMPLE_FLAGS,
    TRUN_SAMPLE_COMPOSITION_OFFSET,
  ];
  let sample_bytes = 4 * sample_fields.into_iter().filter(|flag| flags & flag != 0).count();
  if offset + sample_count as usize * sample_bytes > trun.end {
    return Err("Truncated MP4 trun box".into());
  }
  if flags & TRUN_SAMPLE_DURATION == 0 {
    return Ok(time.saturating_add(u64::from(sample_count) * u64::from(default_duration)));
  }
  let mut time = time;
  for _ in 0..sample_count {
    time = time.saturating_add(u64::from(read_u32(bytes, offset).ok_or(TRUNCATED)?));
    offset += sample_bytes;
  }
  Ok(time)
}

/// Adds the samples of one `moof` fragment to the track durations.
/// # Errors
/// Returns an error if the fragment is malformed or names an unknown track.
fn add_fragment(movie: &mut Movie, moof_bytes: &[u8]) -> Result<(), String> {
  let moof = root(moof_bytes)?;
  for traf in children(moof_bytes, moof.body())? {
    if traf.kind != *b"traf" {
      continue;
    }
    let tfhd = required_child(moof_bytes, &traf, *b"tfhd")?;
    let (_, tfhd_flags) = version_and_flags(moof_bytes, &tfhd)?;
    let id = field_u32(moof_bytes, &tfhd, 0)?;
    movie.absolute_offsets |= tfhd_flags & TFHD_BASE_DATA_OFFSET != 0;
    let track = movie
      .tracks
      .iter_mut()
      .find(|track| track.id == id)
      .ok_or_else(|| format!("MP4 fragment refers to unknown track {id}"))?;
    let mut default_duration = track.default_sample_duration;
    if tfhd_flags & TFHD_DEFAULT_SAMPLE_DURATION != 0 {
      let mut offset = 4;
      for (flag, bytes) in [
        (TFHD_BASE_DATA_OFFSET, 8),
        (TFHD_SAMPLE_DESCRIPTION_INDEX, 4),
      ] {
        if tfhd_flags & flag != 0 {
          offset += bytes;
        }
      }
      default_duration = field_u32(moof_bytes, &tfhd, offset)?;
    }
    let mut time = match child(moof_bytes, &traf, *b"tfdt")? {
      Some(tfdt) if version_and_flags(moof_bytes, &tfdt)?.0 == 1 => {
        read_u64(moof_bytes, tfdt.body().start + 4).ok_or(TRUNCATED)?
      },
      Some(tfdt) => u64::from(field_u32(moof_bytes, &tfdt, 0)?),
      None => track.next_time,
    };
    for trun in children(moof_bytes, traf.body())? {
      if trun.kind == *b"trun" {
        time = trun_end(moof_bytes, &trun, default_duration, time)?;
      }
    }
    track.next_time = time;
    track.duration = track.duration.max(time);
  }
  Ok(())
}

fn rescale(value: u64, from: u32, to: u32) -> u64 {
  let scaled = (u128::from(value) * u128::from(to) + u128::from(from) / 2) / u128::from(from);
  u64::try_from(scaled).unwrap_or(u64::MAX)
}

/// Writes a new size into the header of `target`.
/// # Errors
/// Returns an error if a 32-bit size field cannot hold `size`.
fn set_box_size(bytes: &mut [u8], target: &Mp4Box, size: usize) -> Result<(), String> {
  if target.header == 16 {
    write_bytes(bytes, target.start + 8, &(size as u64).to_be_bytes())
  } else {
    let size = u32::try_from(size).map_err(|_| "MP4 box is too large")?;
    write_bytes(bytes, target.start, &size.to_be_bytes())
  }
}

fn mehd_box(duration: u64) -> Vec<u8> {
  let mut mehd = Vec::with_capacity(20);
  if let Ok(duration) = u32::try_from(duration) {
    mehd.extend_from_slice(&16_u32.to_be_bytes());
    mehd.extend_from_slice(b"mehd");
    mehd.extend_from_slice(&0_u32.to_be_bytes());
    mehd.extend_from_slice(&duration.to_be_bytes());
  } else {
    mehd.extend_from_slice(&20_u32.to_be_bytes());
    mehd.extend_from_slice(b"mehd");
    mehd.extend_from_slice(&0x0100_0000_u32.to_be_bytes());
    mehd.extend_from_slice(&duration.to_be_bytes());
  }
  mehd
}

/// Writes the track and movie durations into `moov`, adding `mehd` when the
/// file can grow without breaking absolute offsets.
/// # Errors
/// Returns an error if `moov` is malformed or the fragments hold no samples.
fn patch_moov(moov_bytes: &mut Vec<u8>, movie: &Movie) -> Result<(), String> {
  let moov = root(moov_bytes)?;
  let mut movie_duration = 0;
  for trak in children(moov_bytes, moov.body())? {
    if trak.kind != *b"trak" {
      continue;
    }
    let (tkhd_version, id_offset) =
      track_id_offset(moov_bytes, &required_child(moov_bytes, &trak, *b"tkhd")?)?;
    let id = read_u32(moov_bytes, id_offset).ok_or(TRUNCATED)?;
    let track = movie.tracks.iter().find(|track| track.id == id).ok_or(TRUNCATED)?;
    if track.timescale == 0 {
      return Err(format!("MP4 track {id} has no timescale"));
    }
    let duration = rescale(track.duration, track.timescale, movie.timescale);
    movie_duration = movie_duration.max(duration);
    write_duration_field(moov_bytes, tkhd_version, id_offset + 8, duration)?;
    let mdia = required_child(moov_bytes, &trak, *b"mdia")?;
    let (mdhd_version, mdhd_duration) =
      header_duration(moov_bytes, &required_child(moov_bytes, &mdia, *b"mdhd")?)?;
    write_duration_field(moov_bytes, mdhd_version, mdhd_duration, track.duration)?;
  }
  if movie_duration == 0 {
    return Err("MP4 fragments contain no samples".into());
  }
  let mvhd = required_child(moov_bytes, &moov, *b"mvhd")?;
  let (mvhd_version, mvhd_duration) = header_duration(moov_bytes, &mvhd)?;
  write_duration_field(moov_bytes, mvhd_version, mvhd_duration, movie_duration)?;

  let Some(mvex) = child(moov_bytes, &moov, *b"mvex")? else {
    return Ok(());
  };
  if let Some(mehd) = child(moov_bytes, &mvex, *b"mehd")? {
    let (mehd_version, _) = version_and_flags(moov_bytes, &mehd)?;
    return write_duration_field(moov_bytes, mehd_version, mehd.body().start + 4, movie_duration);
  }
  if movie.absolute_offsets {
    return Ok(());
  }
  let mehd = mehd_box(movie_duration);
  set_box_size(moov_bytes, &mvex, mvex.end - mvex.start + mehd.len())?;
  set_box_size(moov_bytes, &moov, moov.end - moov.start + mehd.len())?;
  let insert_at = mvex.body().start;
  moov_bytes.splice(insert_at..insert_at, mehd);
  Ok(())
}

/// Top-level boxes of the file, as (type, start, size).
/// # Errors
/// Returns an error if the file cannot be read or a box header is invalid.
fn top_level_boxes(file: &mut File, length: u64) -> Result<Vec<([u8; 4], u64, u64)>, String> {
  let mut boxes = Vec::new();
  let mut offset = 0;
  while length - offset >= 8 {
    let mut head = [0; 16];
    let head = &mut head[..(length - offset).min(16) as usize];
    file.seek(SeekFrom::Start(offset)).map_err(|error| error.to_string())?;
    file.read_exact(head).map_err(|error| error.to_string())?;
    let (kind, _, size) = parse_header(head, length - offset)?;
    boxes.push((kind, offset, size));
    offset += size;
  }
  Ok(boxes)
}

/// Reads a whole header box into memory.
/// # Errors
/// Returns an error if the box is implausibly large or cannot be read.
fn read_box(file: &mut File, start: u64, size: u64) -> Result<Vec<u8>, String> {
  if size > MAX_HEADER_BOX_BYTES {
    return Err("MP4 header box is too large".into());
  }
  let mut bytes = vec![0; size as usize];
  file.seek(SeekFrom::Start(start)).map_err(|error| error.to_string())?;
  file.read_exact(&mut bytes).map_err(|error| error.to_string())?;
  Ok(bytes)
}

/// Copies `file` to `temp_path` with the `moov` box at `moov` (start, size)
/// replaced by `moov_bytes`.
/// # Errors
/// Returns an error if reading, writing or syncing fails.
fn write_patched(
  file: &mut File,
  temp_path: &Path,
  moov: (u64, u64),
  moov_bytes: &[u8],
) -> io::Result<()> {
  let (moov_start, moov_size) = moov;
  let mut output = io::BufWriter::new(File::create(temp_path)?);
  file.seek(SeekFrom::Start(0))?;
  io::copy(&mut Read::take(&mut *file, moov_start), &mut output)?;
  output.write_all(moov_bytes)?;
  file.seek(SeekFrom::Start(moov_start + moov_size))?;
  io::copy(file, &mut output)?;
  output.into_inner().map_err(io::IntoInnerError::into_error)?.sync_all()
}

/// Rewrites a fragmented MP4 so its header carries the duration of its
/// fragments. The original is replaced only once the patched copy is
/// complete.
///
/// # Errors
/// Returns an error if the file is not a fragmented MP4 or cannot be
/// rewritten; the original file is then unchanged.
pub fn write_duration(path: &Path) -> Result<(), String> {
  let mut file = File::open(path).map_err(|error| error.to_string())?;
  let length = file.metadata().map_err(|error| error.to_string())?.len();
  let boxes = top_level_boxes(&mut file, length)?;
  let mut moovs = boxes.iter().filter(|(kind, ..)| kind == b"moov");
  let (Some(&(_, moov_start, moov_size)), None) = (moovs.next(), moovs.next()) else {
    return Err("MP4 file needs exactly one moov box".into());
  };
  let original = read_box(&mut file, moov_start, moov_size)?;
  let mut movie = read_movie(&original)?;
  // Fragment random access offsets are absolute.
  movie.absolute_offsets |= boxes.iter().any(|(kind, ..)| kind == b"mfra");
  for &(_, start, size) in boxes.iter().filter(|(kind, ..)| kind == b"moof") {
    add_fragment(&mut movie, &read_box(&mut file, start, size)?)?;
  }
  let mut patched = original.clone();
  patch_moov(&mut patched, &movie)?;
  if patched == original {
    return Ok(());
  }
  let file_name = path.file_name().ok_or("Recording path has no file name")?;
  let temp_path = path.with_file_name(format!("{}.duration", file_name.to_string_lossy()));
  write_patched(&mut file, &temp_path, (moov_start, moov_size), &patched)
    .and_then(|()| fs::rename(&temp_path, path))
    .map_err(|error| {
      let _ = fs::remove_file(&temp_path);
      format!("Failed to rewrite MP4 header: {error}")
    })
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]
  use super::*;

  const MOVIE_TIMESCALE: u32 = 1000;
  const VIDEO_TIMESCALE: u32 = 90_000;
  const AUDIO_TIMESCALE: u32 = 48_000;

  fn mp4_box(kind: [u8; 4], body: &[u8]) -> Vec<u8> {
    let mut bytes = ((body.len() + 8) as u32).to_be_bytes().to_vec();
    bytes.extend_from_slice(&kind);
    bytes.extend_from_slice(body);
    bytes
  }

  fn full_box(kind: [u8; 4], version: u8, flags: u32, body: &[u8]) -> Vec<u8> {
    let mut bytes = ((u32::from(version) << 24) | flags).to_be_bytes().to_vec();
    bytes.extend_from_slice(body);
    mp4_box(kind, &bytes)
  }

  fn fields(values: &[u64], wide: bool) -> Vec<u8> {
    values
      .iter()
      .flat_map(|&value| {
        if wide {
          value.to_be_bytes().to_vec()
        } else {
          (value as u32).to_be_bytes().to_vec()
        }
      })
      .collect()
  }

  /// `mvhd` or `mdhd`: times, timescale, then duration, followed by padding.
  fn media_header(kind: [u8; 4], version: u8, timescale: u32) -> Vec<u8> {
    let wide = version == 1;
    let mut body = fields(&[1, 2], wide);
    body.extend_from_slice(&timescale.to_be_bytes());
    body.extend(fields(&[0], wide));
    body.extend_from_slice(&[0; 8]);
    full_box(kind, version, 0, &body)
  }

  fn track(version: u8, id: u32, timescale: u32) -> Vec<u8> {
    let wide = version == 1;
    let mut tkhd = fields(&[1, 2], wide);
    tkhd.extend_from_slice(&id.to_be_bytes());
    tkhd.extend_from_slice(&[0; 4]);
    tkhd.extend(fields(&[0], wide));
    tkhd.extend_from_slice(&[0; 60]);
    let stbl = mp4_box(*b"stbl", &full_box(*b"stco", 0, 0, &0_u32.to_be_bytes()));
    let minf = mp4_box(*b"minf", &stbl);
    let mut mdia = media_header(*b"mdhd", version, timescale);
    mdia.extend(minf);
    let mut trak = full_box(*b"tkhd", version, 3, &tkhd);
    trak.extend(mp4_box(*b"mdia", &mdia));
    mp4_box(*b"trak", &trak)
  }

  fn trex(id: u32, default_sample_duration: u32) -> Vec<u8> {
    full_box(
      *b"trex",
      0,
      0,
      &fields(&[id.into(), 1, default_sample_duration.into(), 0, 0], false),
    )
  }

  fn moov(version: u8) -> Vec<u8> {
    let mut body = media_header(*b"mvhd", version, MOVIE_TIMESCALE);
    body.extend(track(version, 1, VIDEO_TIMESCALE));
    body.extend(track(version, 2, AUDIO_TIMESCALE));
    let mut mvex = trex(1, 3000);
    mvex.extend(trex(2, 1024));
    body.extend(mp4_box(*b"mvex", &mvex));
    mp4_box(*b"moov", &body)
  }

  struct Traf<'a> {
    id: u32,
    tfhd_flags: u32,
    tfhd_fields: &'a [u32],
    tfdt: Option<(u8, u64)>,
    trun_flags: u32,
    samples: &'a [u32],
  }

  fn fragment(trafs: &[Traf<'_>]) -> Vec<u8> {
    let mut moof = full_box(*b"mfhd", 0, 0, &1_u32.to_be_bytes());
    for traf in trafs {
      let mut tfhd = traf.id.to_be_bytes().to_vec();
      tfhd.extend(traf.tfhd_fields.iter().flat_map(|field| field.to_be_bytes()));
      let mut body = full_box(*b"tfhd", 0, traf.tfhd_flags, &tfhd);
      if let Some((version, time)) = traf.tfdt {
        body.extend(full_box(*b"tfdt", version, 0, &fields(&[time], version == 1)));
      }
      let fields_per_sample = (traf.trun_flags & 0xF00).count_ones() as usize;
      let mut trun = ((traf.samples.len() / fields_per_sample) as u32).to_be_bytes().to_vec();
      trun.extend_from_slice(&0_u32.to_be_bytes());
      trun.extend(traf.samples.iter().flat_map(|field| field.to_be_bytes()));
      body.extend(full_box(*b"trun", 0, traf.trun_flags, &trun));
      moof.extend(mp4_box(*b"traf", &body));
    }
    let mut bytes = mp4_box(*b"moof", &moof);
    bytes.extend(mp4_box(*b"mdat", &[0xAB; 32]));
    bytes
  }

  /// Video: 10 s at 30 fps, with explicit durations, then `trex` defaults and
  /// no `tfdt`. Audio: from 0.5 s, 246 frames at the `trex` default of 1024,
  /// then 123 frames at a `tfhd` default of 2048.
  fn recording(version: u8, tfhd_flags: u32) -> Vec<u8> {
    let mut bytes = mp4_box(*b"ftyp", b"isom\0\0\0\0isomiso2avc1mp41");
    bytes.extend(moov(version));
    let explicit = [3000_u32, 0x200];
    let video_samples: Vec<u32> = explicit.iter().copied().cycle().take(150 * 2).collect();
    let audio_samples = vec![64_u32; 246];
    bytes.extend(fragment(&[
      Traf {
        id: 1,
        tfhd_flags,
        tfhd_fields: &[],
        tfdt: Some((version, 0)),
        trun_flags: TRUN_DATA_OFFSET | TRUN_SAMPLE_DURATION | TRUN_SAMPLE_SIZE,
        samples: &video_samples,
      },
      Traf {
        id: 2,
        tfhd_flags,
        tfhd_fields: &[],
        tfdt: Some((version, 24_000)),
        trun_flags: TRUN_DATA_OFFSET | TRUN_SAMPLE_SIZE,
        samples: &audio_samples,
      },
    ]));
    let sizes = vec![0x200_u32; 150];
    bytes.extend(fragment(&[
      Traf {
        id: 1,
        tfhd_flags,
        tfhd_fields: &[],
        tfdt: None,
        trun_flags: TRUN_DATA_OFFSET | TRUN_SAMPLE_SIZE,
        samples: &sizes,
      },
      Traf {
        id: 2,
        tfhd_flags: tfhd_flags | TFHD_DEFAULT_SAMPLE_DURATION,
        tfhd_fields: &[2048],
        tfdt: Some((version, 24_000 + 246 * 1024)),
        trun_flags: TRUN_DATA_OFFSET | TRUN_SAMPLE_SIZE,
        samples: &audio_samples[..123],
      },
    ]));
    bytes
  }

  fn patch(bytes: &[u8]) -> Result<Vec<u8>, String> {
    let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
    let path = directory.path().join("Recording_temp.mp4");
    fs::write(&path, bytes).map_err(|error| error.to_string())?;
    write_duration(&path)?;
    assert_eq!(fs::read_dir(directory.path()).map_err(|e| e.to_string())?.count(), 1);
    fs::read(&path).map_err(|error| error.to_string())
  }

  fn moov_range(bytes: &[u8]) -> Result<Mp4Box, String> {
    children(bytes, 0..bytes.len())?
      .into_iter()
      .find(|item| &item.kind == b"moov")
      .ok_or_else(|| "no moov".into())
  }

  fn read_duration(bytes: &[u8], version: u8, offset: usize) -> Result<u64, String> {
    if version == 1 {
      read_u64(bytes, offset).ok_or_else(|| TRUNCATED.into())
    } else {
      read_u32(bytes, offset).map(u64::from).ok_or_else(|| TRUNCATED.into())
    }
  }

  /// Durations from `mvhd`, each `tkhd` and `mdhd`, and `mehd`.
  fn durations(bytes: &[u8]) -> Result<(u64, Vec<(u64, u64)>, Option<u64>), String> {
    let moov = moov_range(bytes)?;
    let mvhd = required_child(bytes, &moov, *b"mvhd")?;
    let (mvhd_version, offset) = header_duration(bytes, &mvhd)?;
    let movie = read_duration(bytes, mvhd_version, offset)?;
    let mut tracks = Vec::new();
    for trak in children(bytes, moov.body())?.into_iter().filter(|item| &item.kind == b"trak") {
      let tkhd = required_child(bytes, &trak, *b"tkhd")?;
      let tkhd_version = version_and_flags(bytes, &tkhd)?.0;
      let tkhd_offset = tkhd.body().start + if tkhd_version == 1 { 28 } else { 20 };
      let mdhd = required_child(bytes, &required_child(bytes, &trak, *b"mdia")?, *b"mdhd")?;
      let (mdhd_version, mdhd_offset) = header_duration(bytes, &mdhd)?;
      tracks.push((
        read_duration(bytes, tkhd_version, tkhd_offset)?,
        read_duration(bytes, mdhd_version, mdhd_offset)?,
      ));
    }
    let mvex = required_child(bytes, &moov, *b"mvex")?;
    let first = children(bytes, mvex.body())?.into_iter().next().ok_or("empty mvex")?;
    let mehd = if &first.kind == b"mehd" {
      Some(read_duration(
        bytes,
        version_and_flags(bytes, &first)?.0,
        first.body().start + 4,
      )?)
    } else {
      None
    };
    Ok((movie, tracks, mehd))
  }

  #[test]
  fn writes_fragment_durations_into_the_header() -> Result<(), String> {
    for version in [0, 1] {
      let original = recording(version, 0x02_0000);
      let patched = patch(&original)?;
      let (movie, tracks, mehd) = durations(&patched)?;
      // Video ends at 300 * 3000 / 90000 = 10 s, audio at 527808 / 48000 = 10.996 s.
      let audio_end = 24_000 + 246 * 1024 + 123 * 2048;
      assert_eq!(movie, 10_996);
      assert_eq!(tracks, vec![(10_000, 900_000), (10_996, audio_end)]);
      assert_eq!(mehd, Some(10_996));
      // Everything after moov is byte-identical, only shifted by the new mehd.
      let (old_moov, new_moov) = (moov_range(&original)?, moov_range(&patched)?);
      assert_eq!(new_moov.end - old_moov.end, 16);
      assert_eq!(patched[..old_moov.start], original[..old_moov.start]);
      assert_eq!(patched[new_moov.end..], original[old_moov.end..]);
      // A second pass finds nothing to change.
      assert_eq!(patch(&patched)?, patched);
    }
    Ok(())
  }

  #[test]
  fn absolute_data_offsets_only_patch_existing_fields() -> Result<(), String> {
    let mut absolute = recording(0, 0);
    // Give the first video tfhd an absolute base-data-offset flag in place.
    let moof = children(&absolute, 0..absolute.len())?
      .into_iter()
      .find(|item| &item.kind == b"moof")
      .ok_or("no moof")?;
    let traf = required_child(&absolute, &moof, *b"traf")?;
    let tfhd = required_child(&absolute, &traf, *b"tfhd")?;
    let mut body = field_u32(&absolute, &tfhd, 0)?.to_be_bytes().to_vec();
    body.extend(0_u64.to_be_bytes());
    let tfhd_bytes = full_box(*b"tfhd", 0, TFHD_BASE_DATA_OFFSET, &body);
    let grown = (tfhd_bytes.len() - (tfhd.end - tfhd.start)) as u32;
    for parent in [moof, traf] {
      let size = read_u32(&absolute, parent.start).ok_or(TRUNCATED)? + grown;
      write_bytes(&mut absolute, parent.start, &size.to_be_bytes())?;
    }
    absolute.splice(tfhd.start..tfhd.end, tfhd_bytes);

    let patched = patch(&absolute)?;
    let (movie, _, mehd) = durations(&patched)?;
    assert_eq!((movie, mehd), (10_996, None));
    assert_eq!(patched.len(), absolute.len());
    let moov = moov_range(&patched)?;
    assert_eq!(patched[moov.end..], absolute[moov.end..]);
    Ok(())
  }

  #[test]
  fn leaves_unparseable_files_unchanged() -> Result<(), String> {
    let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
    let path = directory.path().join("Recording_temp.mp4");
    let mut truncated = recording(0, 0x02_0000);
    truncated.truncate(truncated.len() - 10);
    for bytes in [
      b"not an mp4 file".to_vec(),
      truncated,
      mp4_box(*b"ftyp", b"isom"),
    ] {
      fs::write(&path, &bytes).map_err(|error| error.to_string())?;
      assert!(write_duration(&path).is_err());
      assert_eq!(fs::read(&path).map_err(|error| error.to_string())?, bytes);
    }
    Ok(())
  }

  /// Patches a real recording in place for manual checks:
  /// `MP4_DURATION_FILE=/path/to/copy.mp4 cargo test -- --ignored patch_file_from_env`
  #[test]
  #[ignore = "needs MP4_DURATION_FILE"]
  fn patch_file_from_env() -> Result<(), String> {
    let path = std::env::var("MP4_DURATION_FILE").map_err(|error| error.to_string())?;
    write_duration(Path::new(&path))
  }
}
