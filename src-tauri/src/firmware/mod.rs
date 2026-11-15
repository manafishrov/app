pub mod decompress;
pub mod download;
pub mod drives;
pub mod flash;
pub mod manifest;
pub mod releases;
pub mod status;

pub use download::{FirmwareDownloadRequest, cleanup_cache, download_firmware};
pub use drives::{FlashDrive, list_drives};
pub use flash::{FlashArgs, run as run_flash, run_deferred as run_flash_deferred};
pub use manifest::{FirmwareManifestRequest, FirmwareReleaseManifest, fetch_manifest};
pub use releases::{FirmwareRelease, FirmwareReleasesRequest, fetch_releases};
pub use status::{FlashStatus, parse_line as parse_status_line};

/// Runs a console tool without opening a console window for it.
#[cfg(target_os = "windows")]
fn hidden_command(program: &str) -> std::process::Command {
  use std::os::windows::process::CommandExt;
  const CREATE_NO_WINDOW: u32 = 0x0800_0000;
  let mut command = std::process::Command::new(program);
  command.creation_flags(CREATE_NO_WINDOW);
  command
}
