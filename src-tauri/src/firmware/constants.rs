pub const SIGNING_PUBLIC_KEY: &str = "RWQ79VrKeNgtcTOSQWqd8vI9zVSZbrzXzuUNUzht6ZpHwRLLnUZPSl8s";

pub const DOWNLOAD_PROGRESS_EVENT: &str = "firmware_download_progress";
pub const FLASH_PROGRESS_EVENT: &str = "firmware_flash_progress";

pub const MAX_RELEASES: usize = 4;
pub const MIN_DRIVE_SIZE_BYTES: u64 = 8_000_000_000;
pub const PROGRESS_THROTTLE_MS: u128 = 200;
pub const READ_BUFFER_SIZE: usize = 1024 * 1024;

/// Download retries (resuming from the last byte) on transient errors.
pub const DOWNLOAD_MAX_RETRIES: u32 = 5;
/// Max idle time between chunks before a connection is treated as stalled.
pub const DOWNLOAD_READ_TIMEOUT_SECS: u64 = 60;
/// Max time to establish the connection for a download request.
pub const DOWNLOAD_CONNECT_TIMEOUT_SECS: u64 = 30;
