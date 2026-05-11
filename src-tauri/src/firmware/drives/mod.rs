use serde::{Deserialize, Serialize};

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashDriveMountpoint {
  pub path: String,
  pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashDrive {
  pub device: String,
  pub raw_device: String,
  pub description: String,
  pub size: u64,
  pub block_size: u32,
  pub is_read_only: bool,
  pub is_removable: bool,
  pub is_usb: bool,
  pub is_card: bool,
  pub is_system: bool,
  pub mountpoints: Vec<FlashDriveMountpoint>,
}

use super::constants::MIN_DRIVE_SIZE_BYTES;

/// # Errors
/// Returns an error if drive enumeration fails or is not implemented for the platform.
pub fn list_drives() -> Result<Vec<FlashDrive>, String> {
  #[cfg(target_os = "macos")]
  let drives = macos::list_drives()?;
  #[cfg(target_os = "linux")]
  let drives = linux::list_drives()?;
  #[cfg(target_os = "windows")]
  let drives = windows::list_drives()?;
  #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
  return Err("Drive enumeration is not implemented on this platform".to_string());

  Ok(drives.into_iter().filter(|drive| drive.size >= MIN_DRIVE_SIZE_BYTES).collect())
}
