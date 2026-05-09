use std::fs::OpenOptions;
use std::io::Write;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "phase", rename_all = "kebab-case")]
pub enum FlashStatus {
  Starting,
  Decompressing {
    bytes_processed: u64,
    total_bytes: u64,
  },
  Flashing {
    bytes_written: u64,
    total_bytes: u64,
    bytes_per_second: u64,
  },
  Verifying {
    bytes_verified: u64,
    total_bytes: u64,
  },
  Completed,
  Error {
    message: String,
  },
}

pub struct StatusWriter {
  path: PathBuf,
}

impl StatusWriter {
  /// # Errors
  /// Returns an error if the parent directory of `path` cannot be created.
  pub fn new(path: &Path) -> Result<Self, String> {
    if let Some(parent) = path.parent()
      && !parent.as_os_str().is_empty() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
      }
    Ok(Self {
      path: path.to_path_buf(),
    })
  }

  /// # Errors
  /// Returns an error if the status file cannot be opened or written.
  pub fn write(&mut self, status: &FlashStatus) -> Result<(), String> {
    let mut file = OpenOptions::new()
      .create(true)
      .append(true)
      .open(&self.path)
      .map_err(|e| e.to_string())?;
    let line = serde_json::to_string(status).map_err(|e| e.to_string())?;
    writeln!(file, "{line}").map_err(|e| e.to_string())
  }
}

#[must_use]
pub fn parse_line(line: &str) -> Option<FlashStatus> {
  serde_json::from_str(line.trim()).ok()
}
