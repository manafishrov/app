pub const SIGNING_PUBLIC_KEY: &str = "RWQ79VrKeNgtcTOSQWqd8vI9zVSZbrzXzuUNUzht6ZpHwRLLnUZPSl8s";

pub const DOWNLOAD_PROGRESS_EVENT: &str = "firmware_download_progress";
pub const FLASH_PROGRESS_EVENT: &str = "firmware_flash_progress";

pub const MAX_RELEASES: usize = 4;
pub const MIN_DRIVE_SIZE_BYTES: u64 = 8_000_000_000;
pub const PROGRESS_THROTTLE_MS: u128 = 200;
pub const READ_BUFFER_SIZE: usize = 1024 * 1024;
