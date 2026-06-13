pub const MAX_STABLE_RELEASES: usize = 3;
pub const MAX_PRERELEASES: usize = 2;

// Firmware release repo (app self-update)
pub const APP_REPO_OWNER: &str = "manafishrov";
pub const APP_REPO_NAME: &str = "app";

/// Markers the firmware CI wraps the artifact-links section in; stripped from
/// notes shown in the app.
pub const ASSETS_MARKER_START: &str = "<!-- assets:start -->";
pub const ASSETS_MARKER_END: &str = "<!-- assets:end -->";

// Firmware signing
pub const SIGNING_PUBLIC_KEY: &str = "RWQ79VrKeNgtcTOSQWqd8vI9zVSZbrzXzuUNUzht6ZpHwRLLnUZPSl8s";

// Firmware progress event names
pub const DOWNLOAD_PROGRESS_EVENT: &str = "firmware_download_progress";
pub const FLASH_PROGRESS_EVENT: &str = "firmware_flash_progress";

// Firmware drive / flash tuning
pub const MIN_DRIVE_SIZE_BYTES: u64 = 8_000_000_000;
pub const PROGRESS_THROTTLE_MS: u128 = 200;
pub const READ_BUFFER_SIZE: usize = 1024 * 1024;

// Firmware download tuning
pub const DOWNLOAD_MAX_RETRIES: u32 = 5;
pub const DOWNLOAD_READ_TIMEOUT_SECS: u64 = 60;
pub const DOWNLOAD_CONNECT_TIMEOUT_SECS: u64 = 30;
