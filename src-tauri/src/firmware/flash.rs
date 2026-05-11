use std::fs::OpenOptions;
use std::io::{Seek, SeekFrom, Write};
use std::path::Path;
use std::time::{Duration, Instant};

use serde::Deserialize;

use super::decompress::{ChunkSink, stream_plain, stream_zstd};
use super::status::{FlashSignal, FlashStatus, StatusWriter};

use super::constants::PROGRESS_THROTTLE_MS;

#[derive(Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FlashArgs {
  pub image: String,
  pub device: String,
  pub status_file: String,
  pub image_size: u64,
  pub verify: bool,
}

pub struct DeviceHandle {
  pub file: std::fs::File,
  #[cfg(target_os = "windows")]
  pub _volume_handles: Vec<windows::Win32::Foundation::HANDLE>,
}

impl Drop for DeviceHandle {
  fn drop(&mut self) {
    #[cfg(target_os = "windows")]
    {
      use windows::Win32::Foundation::CloseHandle;
      for handle in std::mem::take(&mut self._volume_handles) {
        unsafe {
          let _ = CloseHandle(handle);
        }
      }
    }
  }
}

#[cfg(target_os = "macos")]
/// # Errors
///
/// Returns an error if the disk cannot be unmounted or its raw device cannot
/// be opened for read/write access.
fn open_device(device: &str) -> Result<DeviceHandle, String> {
  use std::process::Command;

  let unmount = Command::new("/usr/sbin/diskutil")
    .args(["unmountDisk", "force", device])
    .output()
    .map_err(|e| format!("diskutil unmountDisk failed to spawn: {e}"))?;
  if !unmount.status.success() {
    return Err(format!(
      "diskutil unmountDisk failed: {}",
      String::from_utf8_lossy(&unmount.stderr)
    ));
  }

  let raw_path = device.replace("/dev/disk", "/dev/rdisk");
  let file = OpenOptions::new()
    .read(true)
    .write(true)
    .open(&raw_path)
    .map_err(|e| format!("Failed to open raw device {raw_path}: {e}"))?;
  Ok(DeviceHandle { file })
}

#[cfg(target_os = "linux")]
/// # Errors
///
/// Returns an error if matching mounts cannot be read or unmounted, or the
/// block device cannot be opened exclusively for read/write access.
fn open_device(device: &str) -> Result<DeviceHandle, String> {
  use std::ffi::CString;
  use std::fs::read_to_string;
  use std::os::unix::fs::OpenOptionsExt;

  let mounts = read_to_string("/proc/mounts").map_err(|e| e.to_string())?;
  let mut targets: Vec<String> = Vec::new();
  for line in mounts.lines() {
    let mut parts = line.split_whitespace();
    if let (Some(source), Some(target)) = (parts.next(), parts.next()) {
      if source == device || source.starts_with(&format!("{device}p")) || source.starts_with(device)
      {
        targets.push(target.to_string());
      }
    }
  }

  for target in &targets {
    let target_c = CString::new(target.as_str()).map_err(|e| e.to_string())?;
    let attempts = [
      libc::MNT_EXPIRE,
      libc::MNT_EXPIRE,
      libc::MNT_DETACH,
      libc::MNT_FORCE,
    ];
    let mut last_errno = 0;
    let mut ok = false;
    for flag in attempts {
      let rc = unsafe { libc::umount2(target_c.as_ptr(), flag) };
      if rc == 0 {
        ok = true;
        break;
      }
      last_errno = unsafe { *libc::__errno_location() };
    }
    if !ok {
      return Err(format!("Failed to unmount {target} (errno {last_errno})"));
    }
  }

  let file = OpenOptions::new()
    .read(true)
    .write(true)
    .custom_flags(libc::O_DIRECT | libc::O_EXCL)
    .open(device)
    .map_err(|e| format!("Failed to open block device {device}: {e}"))?;
  Ok(DeviceHandle { file })
}

#[cfg(target_os = "windows")]
/// # Errors
///
/// Returns an error if the physical drive path is invalid, related volumes
/// cannot be locked and dismounted, or the drive cannot be opened.
fn open_device(device: &str) -> Result<DeviceHandle, String> {
  use std::os::windows::fs::OpenOptionsExt;
  use std::os::windows::io::FromRawHandle;

  use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE};
  use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_FLAG_NO_BUFFERING, FILE_SHARE_NONE, OPEN_EXISTING,
  };
  use windows::Win32::System::IO::DeviceIoControl;
  use windows::Win32::System::Ioctl::{FSCTL_DISMOUNT_VOLUME, FSCTL_LOCK_VOLUME};
  use windows::core::HSTRING;

  let drive_number = device
    .strip_prefix("\\\\.\\PhysicalDrive")
    .and_then(|n| n.parse::<u32>().ok())
    .ok_or_else(|| format!("Unsupported Windows device path {device}"))?;

  let volumes = enumerate_volumes_for_drive(drive_number)?;
  let mut volume_handles: Vec<HANDLE> = Vec::new();
  for letter in volumes {
    let path = HSTRING::from(format!("\\\\.\\{letter}:"));
    let volume_handle = unsafe {
      CreateFileW(
        &path,
        (GENERIC_READ | GENERIC_WRITE).0,
        windows::Win32::Storage::FileSystem::FILE_SHARE_MODE(
          windows::Win32::Storage::FileSystem::FILE_SHARE_READ.0
            | windows::Win32::Storage::FileSystem::FILE_SHARE_WRITE.0,
        ),
        None,
        OPEN_EXISTING,
        windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES(0),
        None,
      )
    }
    .map_err(|e| format!("CreateFile {letter}: failed: {e}"))?;
    let lock_ok =
      unsafe { DeviceIoControl(volume_handle, FSCTL_LOCK_VOLUME, None, 0, None, 0, None, None) };
    if lock_ok.is_err() {
      let _ = unsafe { CloseHandle(volume_handle) };
      return Err(format!("FSCTL_LOCK_VOLUME failed for {letter}:"));
    }
    let dismount_ok = unsafe {
      DeviceIoControl(volume_handle, FSCTL_DISMOUNT_VOLUME, None, 0, None, 0, None, None)
    };
    if dismount_ok.is_err() {
      let _ = unsafe { CloseHandle(volume_handle) };
      return Err(format!("FSCTL_DISMOUNT_VOLUME failed for {letter}:"));
    }
    volume_handles.push(volume_handle);
  }

  let path = HSTRING::from(device);
  let drive_handle = unsafe {
    CreateFileW(
      &path,
      (GENERIC_READ | GENERIC_WRITE).0,
      FILE_SHARE_NONE,
      None,
      OPEN_EXISTING,
      FILE_FLAG_NO_BUFFERING,
      None,
    )
  }
  .map_err(|e| format!("CreateFile {device}: failed: {e}"))?;

  let raw = drive_handle.0;
  let file = unsafe { std::fs::File::from_raw_handle(raw as _) };
  Ok(DeviceHandle {
    file,
    _volume_handles: volume_handles,
  })
}

#[cfg(target_os = "windows")]
fn enumerate_volumes_for_drive(drive_number: u32) -> Result<Vec<char>, String> {
  use std::process::Command;

  let script = format!(
    "Get-Partition -DiskNumber {drive_number} | Where-Object {{ $_.DriveLetter }} | ForEach-Object {{ [string]$_.DriveLetter }}"
  );
  let output = Command::new("powershell")
    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
    .output()
    .map_err(|e| format!("powershell failed to spawn: {e}"))?;
  if !output.status.success() {
    return Err(format!("powershell failed: {}", String::from_utf8_lossy(&output.stderr)));
  }
  Ok(
    String::from_utf8_lossy(&output.stdout)
      .lines()
      .filter_map(|line| line.trim().chars().next())
      .filter(char::is_ascii_alphabetic)
      .collect(),
  )
}

struct DeviceSink<'a> {
  device: &'a mut DeviceHandle,
  status: &'a mut StatusWriter,
  position: u64,
  bytes_written: u64,
  total_size: u64,
  first_buffer: Option<Vec<u8>>,
  delay_first: bool,
  started_at: Instant,
  last_progress: Instant,
  cancelled: bool,
}

impl ChunkSink for DeviceSink<'_> {
  fn write_chunk(&mut self, chunk: &[u8]) -> Result<(), String> {
    if self.cancelled {
      return Err("Cancelled".to_string());
    }
    if self.delay_first && self.first_buffer.is_none() {
      self.first_buffer = Some(chunk.to_vec());
      self.position += u64::try_from(chunk.len()).map_err(|e| e.to_string())?;
      return Ok(());
    }
    self
      .device
      .file
      .write_all(chunk)
      .map_err(|e| format!("Device write failed at position {}: {e}", self.position))?;
    self.position += u64::try_from(chunk.len()).map_err(|e| e.to_string())?;
    self.bytes_written += u64::try_from(chunk.len()).map_err(|e| e.to_string())?;
    Ok(())
  }

  fn on_progress(&mut self, _bytes_read: u64, _total_bytes: u64) {
    let now = Instant::now();
    if now.duration_since(self.last_progress).as_millis() < PROGRESS_THROTTLE_MS {
      return;
    }
    self.last_progress = now;
    let elapsed = now.duration_since(self.started_at).as_secs_f64();
    let speed = if elapsed > 0.0 {
      #[allow(clippy::cast_sign_loss)]
      // bytes_written is non-negative and elapsed > 0.0 keeps the computed rate non-negative.
      {
        (self.bytes_written as f64 / elapsed).floor().clamp(0.0, u64::MAX as f64) as u64
      }
    } else {
      0
    };
    let _ = self.status.write(&FlashStatus::Flashing {
      bytes_written: self.bytes_written,
      total_bytes: self.total_size,
      bytes_per_second: speed,
    });
  }

  fn cancelled(&self) -> bool {
    self.cancelled
  }
}

/// # Errors
///
/// Returns an error if the delayed first buffer cannot be written back or the
/// device cannot be flushed.
fn finalise_device_writes(sink: &mut DeviceSink<'_>) -> Result<(), String> {
  if let Some(first_buffer) = sink.first_buffer.take() {
    sink
      .device
      .file
      .seek(SeekFrom::Start(0))
      .map_err(|e| format!("Failed to seek to start: {e}"))?;
    sink
      .device
      .file
      .write_all(&first_buffer)
      .map_err(|e| format!("Failed to write delayed first buffer: {e}"))?;
    sink.bytes_written += u64::try_from(first_buffer.len()).map_err(|e| e.to_string())?;
  }
  sink.device.file.flush().map_err(|e| format!("Final flush failed: {e}"))?;
  Ok(())
}

/// # Errors
///
/// Returns an error if the image cannot be streamed, written to the device, or
/// final device writes cannot be flushed.
fn flash_image(
  status: &mut StatusWriter,
  device: &mut DeviceHandle,
  image: &str,
  image_size: u64,
  verify: bool,
) -> Result<(), String> {
  let mut sink = DeviceSink {
    device,
    status,
    position: 0,
    bytes_written: 0,
    total_size: image_size,
    first_buffer: None,
    delay_first: cfg!(target_os = "windows"),
    started_at: Instant::now(),
    last_progress: Instant::now(),
    cancelled: false,
  };

  let is_zstd = image.to_lowercase().ends_with(".zst");
  let total_decompressed = if is_zstd {
    stream_zstd(image, image_size, &mut sink)?
  } else {
    stream_plain(image, image_size, &mut sink)?
  };

  finalise_device_writes(&mut sink)?;
  let _ = total_decompressed;
  let _ = verify;
  status.write(&FlashStatus::Completed)
}

/// # Errors
/// Returns an error if any phase of the flash fails: unmount, device open,
/// decompression, write, or finalise.
pub fn run(args: &FlashArgs) -> Result<(), String> {
  let mut status = StatusWriter::new(Path::new(&args.status_file))?;
  status.write(&FlashStatus::Starting)?;
  let mut device = open_device(&args.device)?;
  flash_image(&mut status, &mut device, &args.image, args.image_size, args.verify)
}

/// # Errors
/// Returns an error if the device cannot be opened or the signal file is
/// missing or malformed.
pub fn run_deferred(device_path: &str, status_file: &str, signal_file: &str) -> Result<(), String> {
  let mut status = StatusWriter::new(Path::new(status_file))?;
  status.write(&FlashStatus::WaitingForImage)?;

  let signal: FlashSignal = loop {
    std::thread::sleep(Duration::from_millis(200));
    if let Ok(contents) = std::fs::read_to_string(signal_file)
      && let Ok(parsed) = serde_json::from_str::<FlashSignal>(&contents)
    {
      break parsed;
    }
  };

  status.write(&FlashStatus::Starting)?;
  let mut device = open_device(device_path)?;
  flash_image(&mut status, &mut device, &signal.image, signal.image_size, false)
}
