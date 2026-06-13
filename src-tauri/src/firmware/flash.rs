use std::io::{Seek, SeekFrom, Write};
use std::path::Path;
use std::time::{Duration, Instant};

use serde::Deserialize;

use super::decompress::{ChunkSink, stream_plain, stream_zstd};
use super::status::{FlashSignal, FlashStatus, StatusWriter};

use crate::constants::PROGRESS_THROTTLE_MS;

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
  use std::fs::OpenOptions;
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
  use std::fs::{OpenOptions, read_to_string};
  use std::os::unix::fs::OpenOptionsExt;

  let mounts = read_to_string("/proc/mounts").map_err(|e| e.to_string())?;
  let mut targets: Vec<String> = Vec::new();
  for line in mounts.lines() {
    let mut parts = line.split_whitespace();
    if let (Some(source), Some(target)) = (parts.next(), parts.next())
      && (source == device
        || source.starts_with(&format!("{device}p"))
        || source.starts_with(device))
    {
      targets.push(target.to_string());
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

  // O_EXCL for exclusive access. No O_DIRECT: it requires block-aligned
  // writes, but decompressed chunks are arbitrary sizes (EINVAL otherwise).
  // Durability comes from the final sync_all in flush_device_to_media.
  let file = OpenOptions::new()
    .read(true)
    .write(true)
    .custom_flags(libc::O_EXCL)
    .open(device)
    .map_err(|e| format!("Failed to open block device {device}: {e}"))?;
  Ok(DeviceHandle { file })
}

#[cfg(target_os = "windows")]
const WINDOWS_DISKPART_MIN_INTERVAL: Duration = Duration::from_secs(15);

#[cfg(target_os = "windows")]
static WINDOWS_LAST_DISKPART_RUN: std::sync::OnceLock<std::sync::Mutex<Option<Instant>>> =
  std::sync::OnceLock::new();

#[cfg(target_os = "windows")]
fn run_diskpart_script(context: &str, contents: &str) -> Result<(), String> {
  use std::io::Write as _;
  use std::process::Command;

  let mut script =
    tempfile::NamedTempFile::new().map_err(|e| format!("Failed to create diskpart script: {e}"))?;
  script
    .write_all(contents.as_bytes())
    .map_err(|e| format!("Failed to write diskpart script: {e}"))?;
  script.flush().map_err(|e| format!("Failed to flush diskpart script: {e}"))?;

  let last_run = WINDOWS_LAST_DISKPART_RUN.get_or_init(|| std::sync::Mutex::new(None));
  let mut last_run_guard = last_run
    .lock()
    .map_err(|e| format!("Failed to coordinate diskpart access: {e}"))?;
  if let Some(finished_at) = *last_run_guard
    && let Some(duration) = WINDOWS_DISKPART_MIN_INTERVAL.checked_sub(finished_at.elapsed())
  {
    std::thread::sleep(duration);
  }

  let output_result = Command::new("diskpart").arg("/s").arg(script.path()).output();
  *last_run_guard = Some(Instant::now());
  let output = output_result.map_err(|e| format!("Failed to run diskpart: {e}"))?;

  if output.status.success() {
    return Ok(());
  }

  let stdout = String::from_utf8_lossy(&output.stdout);
  let stderr = String::from_utf8_lossy(&output.stderr);
  Err(format!(
    "{context}. Diskpart status: {}. Diskpart script: {contents:?}. Diskpart stdout: {stdout}. Diskpart stderr: {stderr}",
    output.status
  ))
}

#[cfg(target_os = "windows")]
/// # Errors
///
/// Returns an error if the physical drive path is invalid, related volumes
/// cannot be locked and dismounted, or the drive cannot be opened.
fn open_device(device: &str) -> Result<DeviceHandle, String> {
  use std::os::windows::io::FromRawHandle;

  use windows::Win32::Foundation::{CloseHandle, GENERIC_READ, GENERIC_WRITE, HANDLE};
  use windows::Win32::Storage::FileSystem::{CreateFileW, OPEN_EXISTING};
  use windows::Win32::System::IO::DeviceIoControl;
  use windows::Win32::System::Ioctl::FSCTL_DISMOUNT_VOLUME;
  use windows::core::HSTRING;

  let drive_number = device
    .strip_prefix("\\\\.\\PhysicalDrive")
    .and_then(|n| n.parse::<u32>().ok())
    .ok_or_else(|| format!("Unsupported Windows device path {device}"))?;

  ensure_windows_disk_is_flash_target(drive_number)?;

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
    .map_err(|e| format!("CreateFile {letter}: failed before forced mount-point removal: {e}"));
    let Ok(volume_handle) = volume_handle else {
      remove_windows_volume_mountpoints(letter)?;
      continue;
    };
    if let Err(message) = lock_volume_with_retries(volume_handle, letter) {
      let _ = unsafe { CloseHandle(volume_handle) };
      remove_windows_volume_mountpoints(letter).map_err(|remove_error| {
        format!("{message}. Forced mount-point removal also failed: {remove_error}")
      })?;
      continue;
    }
    let dismount_ok = unsafe {
      DeviceIoControl(volume_handle, FSCTL_DISMOUNT_VOLUME, None, 0, None, 0, None, None)
    };
    if dismount_ok.is_err() {
      let _ = unsafe { CloseHandle(volume_handle) };
      remove_windows_volume_mountpoints(letter)?;
      continue;
    }
    volume_handles.push(volume_handle);
  }

  close_windows_volume_handles(&mut volume_handles);
  clean_windows_disk(drive_number)?;
  let drive_handle = open_physical_drive_with_retries(device)?;

  let raw = drive_handle.0;
  let file = unsafe { std::fs::File::from_raw_handle(raw as _) };
  Ok(DeviceHandle {
    file,
    _volume_handles: volume_handles,
  })
}

#[cfg(target_os = "windows")]
fn close_windows_volume_handles(handles: &mut Vec<windows::Win32::Foundation::HANDLE>) {
  use windows::Win32::Foundation::CloseHandle;

  for handle in std::mem::take(handles) {
    unsafe {
      let _ = CloseHandle(handle);
    }
  }
}

#[cfg(target_os = "windows")]
fn ensure_windows_disk_is_flash_target(drive_number: u32) -> Result<(), String> {
  use std::process::Command;

  let script = format!(
    "$ErrorActionPreference = 'Stop'; $disk = Get-Disk -Number {drive_number}; if ($disk.IsBoot -or $disk.IsSystem) {{ Write-Error 'Refusing to flash a boot/system disk'; exit 10 }}; $bus = [string]$disk.BusType; if (@('USB', 'SD', 'MMC', 'Removable') -notcontains $bus) {{ Write-Error \"Refusing to flash non-removable disk with bus type $bus\"; exit 11 }}"
  );
  let output = Command::new("powershell")
    .args(["-NoProfile", "-NonInteractive", "-Command", &script])
    .output()
    .map_err(|e| format!("Failed to validate selected Windows disk: {e}"))?;
  if output.status.success() {
    return Ok(());
  }

  let stdout = String::from_utf8_lossy(&output.stdout);
  let stderr = String::from_utf8_lossy(&output.stderr);
  Err(format!(
    "Windows rejected the selected flash target before erasing. PowerShell stdout: {stdout}. PowerShell stderr: {stderr}"
  ))
}

#[cfg(target_os = "windows")]
fn remove_windows_volume_mountpoints(letter: char) -> Result<(), String> {
  let script = format!("select volume {letter}\nremove all dismount\nexit\n");
  run_diskpart_script(
    &format!("Windows could not remove mount points for {letter}: before flashing"),
    &script,
  )
}

#[cfg(target_os = "windows")]
fn clean_windows_disk(drive_number: u32) -> Result<(), String> {
  let script = format!(
    "rescan\nselect disk {drive_number}\nattributes disk clear readonly noerr\nonline disk noerr\nclean\nexit\n"
  );
  run_diskpart_script("Windows could not clear the selected disk before flashing", &script)
}

#[cfg(target_os = "windows")]
fn open_physical_drive_with_retries(
  device: &str,
) -> Result<windows::Win32::Foundation::HANDLE, String> {
  use windows::Win32::Foundation::{GENERIC_READ, GENERIC_WRITE};
  use windows::Win32::Storage::FileSystem::{
    CreateFileW, FILE_FLAG_NO_BUFFERING, FILE_SHARE_NONE, OPEN_EXISTING,
  };
  use windows::core::HSTRING;

  const OPEN_RETRY_ATTEMPTS: u32 = 20;
  const OPEN_RETRY_DELAY: Duration = Duration::from_millis(250);

  let path = HSTRING::from(device);
  let mut last_error = String::new();
  for attempt in 1..=OPEN_RETRY_ATTEMPTS {
    let result = unsafe {
      CreateFileW(
        &path,
        (GENERIC_READ | GENERIC_WRITE).0,
        FILE_SHARE_NONE,
        None,
        OPEN_EXISTING,
        FILE_FLAG_NO_BUFFERING,
        None,
      )
    };
    match result {
      Ok(handle) => return Ok(handle),
      Err(error) => {
        last_error = error.to_string();
        if attempt < OPEN_RETRY_ATTEMPTS {
          std::thread::sleep(OPEN_RETRY_DELAY);
        }
      },
    }
  }

  Err(format!(
    "Windows cleared the selected disk, but {device} could not be opened for exclusive flashing. Unplug and reinsert the drive, then try again. Windows error: {last_error}"
  ))
}

#[cfg(target_os = "windows")]
fn lock_volume_with_retries(
  volume_handle: windows::Win32::Foundation::HANDLE,
  letter: char,
) -> Result<(), String> {
  use windows::Win32::System::IO::DeviceIoControl;
  use windows::Win32::System::Ioctl::FSCTL_LOCK_VOLUME;

  const LOCK_RETRY_ATTEMPTS: u32 = 20;
  const LOCK_RETRY_DELAY: Duration = Duration::from_millis(250);

  let mut last_error = String::new();
  for attempt in 1..=LOCK_RETRY_ATTEMPTS {
    match unsafe { DeviceIoControl(volume_handle, FSCTL_LOCK_VOLUME, None, 0, None, 0, None, None) }
    {
      Ok(()) => return Ok(()),
      Err(error) => {
        last_error = error.to_string();
        if attempt < LOCK_RETRY_ATTEMPTS {
          std::thread::sleep(LOCK_RETRY_DELAY);
        }
      },
    }
  }

  Err(format!(
    "Drive {letter}: is still in use and could not be locked for flashing. Close File Explorer windows, terminals, sync/backup tools, and antivirus scans using that drive, then try again. Windows error: {last_error}"
  ))
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
      let chunk_len = u64::try_from(chunk.len()).map_err(|e| e.to_string())?;
      self.first_buffer = Some(chunk.to_vec());
      // Reserve the offset range for the delayed first chunk so subsequent
      // writes land at the correct device offsets instead of overwriting it.
      self
        .device
        .file
        .seek(SeekFrom::Start(chunk_len))
        .map_err(|e| format!("Failed to seek past delayed first chunk: {e}"))?;
      self.position += chunk_len;
      self.bytes_written += chunk_len;
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

  fn on_progress(&mut self, _bytes_read: u64, total_bytes: u64) {
    let now = Instant::now();
    if now.duration_since(self.last_progress).as_millis() < PROGRESS_THROTTLE_MS {
      return;
    }
    if total_bytes > 0 {
      self.total_size = total_bytes;
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
  }
  sink.device.file.flush().map_err(|e| format!("Final flush failed: {e}"))?;
  flush_device_to_media(&sink.device.file)?;
  Ok(())
}

#[cfg(target_os = "windows")]
/// # Errors
/// Returns an error if `FlushFileBuffers` rejects the handle.
fn flush_device_to_media(file: &std::fs::File) -> Result<(), String> {
  use std::os::windows::io::AsRawHandle;

  use windows::Win32::Foundation::HANDLE;
  use windows::Win32::Storage::FileSystem::FlushFileBuffers;

  let handle = HANDLE(file.as_raw_handle() as _);
  unsafe { FlushFileBuffers(handle) }.map_err(|e| format!("FlushFileBuffers failed: {e}"))
}

#[cfg(target_os = "macos")]
/// # Errors
/// Returns an error if both the macOS full-sync and fallback sync syscalls fail
/// for reasons other than an unsupported removable-device flush.
fn flush_device_to_media(file: &std::fs::File) -> Result<(), String> {
  use std::os::fd::AsRawFd;

  let full_sync_result = unsafe { libc::fcntl(file.as_raw_fd(), libc::F_FULLFSYNC) };
  if full_sync_result == 0 {
    return Ok(());
  }

  let full_sync_error = std::io::Error::last_os_error();
  match file.sync_all() {
    Ok(()) => Ok(()),
    Err(sync_error)
      if is_macos_unsupported_sync_error(&full_sync_error)
        && is_macos_unsupported_sync_error(&sync_error) =>
    {
      crate::log_warn!(
        "macOS final device sync unsupported after flashing; continuing after completed writes. F_FULLFSYNC failed: {full_sync_error}; fsync failed: {sync_error}"
      );
      Ok(())
    },
    Err(sync_error) => Err(format!(
      "Final sync failed: {sync_error}; F_FULLFSYNC also failed: {full_sync_error}"
    )),
  }
}

#[cfg(target_os = "macos")]
fn is_macos_unsupported_sync_error(error: &std::io::Error) -> bool {
  matches!(
    error.raw_os_error(),
    Some(code) if code == libc::ENOTTY || code == libc::ENOTSUP || code == libc::EINVAL
  )
}

#[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
/// # Errors
/// Returns an error if the device sync syscall fails.
fn flush_device_to_media(file: &std::fs::File) -> Result<(), String> {
  file.sync_all().map_err(|e| format!("Final sync failed: {e}"))
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
