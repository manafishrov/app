//! Downloads photos taken on the ROV into the photo folder.
//!
//! The ROV keeps each photo (a JPEG and a RAW .dng) in an outbox until the app
//! has stored it, and the app then deletes it there. Transfers use their own
//! HTTP connection, separate from the control WebSocket, so they never delay
//! control messages or telemetry, and the ROV paces them so they leave room for
//! the live video. Files are stored byte for byte as the camera wrote them.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use futures_util::StreamExt;
use reqwest::Client;
use serde::Deserialize;
use serde_json::Value;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;
use tokio::sync::Notify;

use crate::config::get_config_from_file;
use crate::models::toast::ToastContent;
use crate::toast::{toast_error, toast_loading, toast_success};
use crate::websocket::capabilities::CapabilityState;
use crate::{log_info, log_warn};

/// Port of the ROV's photo transfer server (firmware `photo.TRANSFER_PORT`).
const TRANSFER_PORT: u16 = 9001;
/// How often to look for photos taken by custom actions or left over from an
/// earlier connection.
const IDLE_POLL: Duration = Duration::from_secs(5);
/// How often to look while the ROV is still writing a photo.
const SAVING_POLL: Duration = Duration::from_millis(300);
const CONNECT_TIMEOUT: Duration = Duration::from_secs(3);
/// A RAW file is about 25 MB, about 5 s at the ROV's pace; allow a slow tether.
const DOWNLOAD_TIMEOUT: Duration = Duration::from_secs(180);

/// Wakes the receiver right after the app asked for a photo.
#[derive(Default)]
pub struct PhotoReceiverState {
  wake: Notify,
}

#[derive(Deserialize)]
struct Outbox {
  ready: Vec<ReadyPhoto>,
  saving: Vec<String>,
  failed: Vec<FailedPhoto>,
}

#[derive(Deserialize)]
struct ReadyPhoto {
  id: String,
  files: Vec<PhotoFile>,
}

#[derive(Deserialize)]
struct PhotoFile {
  name: String,
}

#[derive(Deserialize)]
struct FailedPhoto {
  id: String,
  error: String,
}

/// Starts the background receiver; it polls only while the ROV is connected.
pub fn start(app: AppHandle) {
  tauri::async_runtime::spawn(run(app));
}

/// Looks for new photos now instead of at the next idle poll.
pub fn wake(app: &AppHandle) {
  app.state::<PhotoReceiverState>().wake.notify_one();
}

async fn run(app: AppHandle) {
  let client = match Client::builder()
    .connect_timeout(CONNECT_TIMEOUT)
    .timeout(DOWNLOAD_TIMEOUT)
    .build()
  {
    Ok(client) => client,
    Err(error) => {
      log_warn!("Photo receiver unavailable: {error}");
      return;
    },
  };
  let wake = app.state::<PhotoReceiverState>();
  let mut receiver = Receiver::default();
  loop {
    let delay = if app.state::<CapabilityState>().is_connected() {
      receiver.receive_ready_photos(&app, &client).await
    } else {
      IDLE_POLL
    };
    tokio::select! {
      () = wake.wake.notified() => {},
      () = tokio::time::sleep(delay) => {},
    }
  }
}

fn outbox_url(ip_address: &str) -> String {
  format!("http://{ip_address}:{TRANSFER_PORT}/photos")
}

#[derive(Default)]
struct Receiver {
  /// Photos whose "receiving" toast is showing.
  announced: HashSet<String>,
  unreachable: bool,
}

impl Receiver {
  fn announce(&mut self, photo_id: &str) {
    if self.announced.insert(photo_id.to_string()) {
      show_photo_receiving(photo_id);
    }
  }

  /// Stores every finished photo and reports failed ones. Returns how long to
  /// wait before looking again.
  async fn receive_ready_photos(&mut self, app: &AppHandle, client: &Client) -> Duration {
    let config = get_config_from_file();
    let base = outbox_url(&config.ip_address);
    let outbox = match fetch_outbox(client, &base).await {
      Ok(outbox) => outbox,
      Err(error) => {
        // Firmware without photos has no transfer server; say so only once.
        if !self.unreachable {
          log_warn!("Cannot reach the ROV's photo outbox: {error}");
        }
        self.unreachable = true;
        return IDLE_POLL;
      },
    };
    self.unreachable = false;

    for failed in &outbox.failed {
      log_warn!("The ROV could not save photo {}: {}", failed.id, failed.error);
      show_photo_failed(&failed.id, &failed.error);
      self.announced.remove(&failed.id);
      let _ = delete(client, &base, &failed.id).await;
    }
    for id in &outbox.saving {
      self.announce(id);
    }
    for photo in &outbox.ready {
      self.announce(&photo.id);
      let stored = store_photo(app, client, &base, &config.photo_directory, photo).await;
      self.announced.remove(&photo.id);
      match stored {
        Ok(location) => {
          log_info!("Photo saved to {location}");
          show_photo_saved(&photo.id, &location);
        },
        Err(error) => {
          // The photo stays in the ROV's outbox; try again later.
          log_warn!("Failed to receive photo {}: {error}", photo.id);
          show_photo_failed(&photo.id, &error);
          return IDLE_POLL;
        },
      }
    }
    if outbox.saving.is_empty() {
      IDLE_POLL
    } else {
      SAVING_POLL
    }
  }
}

/// # Errors
/// Returns an error if the ROV cannot be reached or answers unexpectedly.
async fn fetch_outbox(client: &Client, base: &str) -> Result<Outbox, String> {
  client
    .get(base)
    .send()
    .await
    .and_then(reqwest::Response::error_for_status)
    .map_err(|error| error.to_string())?
    .json::<Outbox>()
    .await
    .map_err(|error| error.to_string())
}

/// # Errors
/// Returns an error if the ROV does not confirm the deletion.
async fn delete(client: &Client, base: &str, id: &str) -> Result<(), String> {
  client
    .delete(format!("{base}/{id}"))
    .send()
    .await
    .and_then(reqwest::Response::error_for_status)
    .map(|_| ())
    .map_err(|error| error.to_string())
}

/// Downloads every file of a photo, stores it under one shared name and only
/// then removes it from the ROV. Returns where the JPEG (or first file) went.
///
/// # Errors
/// Returns network and file system errors; nothing is deleted on the ROV then.
async fn store_photo(
  app: &AppHandle,
  client: &Client,
  base: &str,
  directory: &str,
  photo: &ReadyPhoto,
) -> Result<String, String> {
  let stem = photo_stem(SystemTime::now());
  let mut location = None;
  for file in &photo.files {
    let extension = extension_of(&file.name)?;
    let temp = temp_path(app, directory, &file.name)?;
    download(client, &format!("{base}/{}", file.name), &temp).await?;
    let saved = save(app, &temp, directory, &stem, extension).await;
    let _ = tokio::fs::remove_file(&temp).await;
    let saved = saved?;
    location.get_or_insert(saved);
  }
  delete(client, base, &photo.id).await?;
  location.ok_or_else(|| "The ROV sent a photo without files".into())
}

/// Only the files the camera writes are accepted, so a name from the ROV can
/// never point outside the photo folder.
///
/// # Errors
/// Returns an error for any other file name.
fn extension_of(name: &str) -> Result<&'static str, String> {
  let valid_stem = |stem: &str| {
    stem.starts_with("photo_")
      && stem.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
  };
  match name.rsplit_once('.') {
    Some((stem, "jpg")) if valid_stem(stem) => Ok("jpg"),
    Some((stem, "dng")) if valid_stem(stem) => Ok("dng"),
    _ => Err(format!("Unexpected photo file from the ROV: {name}")),
  }
}

/// `Photo_YYYY-MM-DD_HH-MM-SS` in UTC, like recordings. The PC's clock names
/// photos because the ROV has no battery-backed clock.
fn photo_stem(now: SystemTime) -> String {
  let seconds = now.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();
  let days = i64::try_from(seconds / 86_400).unwrap_or_default();
  let time = seconds % 86_400;
  let (year, month, day) = civil_from_days(days);
  format!(
    "Photo_{year:04}-{month:02}-{day:02}_{:02}-{:02}-{:02}",
    time / 3600,
    time / 60 % 60,
    time % 60
  )
}

/// Gregorian date of a day count since 1970-01-01 (Howard Hinnant's algorithm).
fn civil_from_days(days: i64) -> (i64, i64, i64) {
  let z = days + 719_468;
  let era = z.div_euclid(146_097);
  let day_of_era = z.rem_euclid(146_097);
  let year_of_era =
    (day_of_era - day_of_era / 1460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
  let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
  let shifted_month = (5 * day_of_year + 2) / 153;
  let day = day_of_year - (153 * shifted_month + 2) / 5 + 1;
  let month = if shifted_month < 10 {
    shifted_month + 3
  } else {
    shifted_month - 9
  };
  let year = year_of_era + era * 400 + i64::from(month <= 2);
  (year, month, day)
}

/// Where a file is downloaded before it gets its final name: next to the
/// destination on desktop (so the final rename is instant), or the app cache
/// on mobile, where folders are only reachable through the system.
///
/// # Errors
/// Returns an error if the folder cannot be created.
fn temp_path(app: &AppHandle, directory: &str, name: &str) -> Result<PathBuf, String> {
  let folder = temp_folder(app, directory)?;
  std::fs::create_dir_all(&folder)
    .map_err(|error| format!("Cannot create {}: {error}", folder.display()))?;
  Ok(folder.join(format!(".{name}.part")))
}

/// # Errors
/// Never fails on desktop; mobile can fail to find the cache folder.
#[cfg(desktop)]
#[allow(clippy::unnecessary_wraps)]
fn temp_folder(_app: &AppHandle, directory: &str) -> Result<PathBuf, String> {
  Ok(PathBuf::from(directory))
}

/// # Errors
/// Returns an error if the app cache folder cannot be found.
#[cfg(mobile)]
fn temp_folder(app: &AppHandle, _directory: &str) -> Result<PathBuf, String> {
  Ok(app.path().app_cache_dir().map_err(|error| error.to_string())?.join("photos"))
}

/// # Errors
/// Returns network errors, an incomplete download, or file write errors.
async fn download(client: &Client, url: &str, path: &Path) -> Result<(), String> {
  let response = client
    .get(url)
    .send()
    .await
    .and_then(reqwest::Response::error_for_status)
    .map_err(|error| error.to_string())?;
  let expected = response.content_length();
  let mut file = tokio::fs::File::create(path).await.map_err(|error| error.to_string())?;
  let mut written: u64 = 0;
  let mut stream = response.bytes_stream();
  while let Some(chunk) = stream.next().await {
    let chunk = chunk.map_err(|error| error.to_string())?;
    file.write_all(&chunk).await.map_err(|error| error.to_string())?;
    written += chunk.len() as u64;
  }
  if expected.is_some_and(|expected| expected != written) {
    return Err("The photo download was cut off".into());
  }
  file.sync_all().await.map_err(|error| error.to_string())
}

/// Gives the downloaded file its final name in the photo folder, never
/// replacing an existing photo. Returns where it was saved.
///
/// # Errors
/// Returns file system errors.
#[cfg(desktop)]
async fn save(
  _app: &AppHandle,
  temp: &Path,
  directory: &str,
  stem: &str,
  extension: &str,
) -> Result<String, String> {
  save_into(temp, directory, stem, extension).await
}

/// # Errors
/// Returns file system errors.
#[cfg(desktop)]
async fn save_into(
  temp: &Path,
  directory: &str,
  stem: &str,
  extension: &str,
) -> Result<String, String> {
  let directory = Path::new(directory);
  let mut target = directory.join(format!("{stem}.{extension}"));
  let mut counter = 2;
  while target.exists() {
    target = directory.join(format!("{stem}_{counter}.{extension}"));
    counter += 1;
  }
  tokio::fs::rename(temp, &target).await.map_err(|error| error.to_string())?;
  Ok(target.display().to_string())
}

/// Copies the downloaded file into the picked folder (or the platform default).
///
/// # Errors
/// Returns an error if the folder cannot be written.
#[cfg(mobile)]
async fn save(
  app: &AppHandle,
  temp: &Path,
  directory: &str,
  stem: &str,
  extension: &str,
) -> Result<String, String> {
  use tauri_plugin_manafish_mobile::MobileExt;

  let mime_type = if extension == "jpg" {
    "image/jpeg"
  } else {
    "image/x-adobe-dng"
  };
  app
    .mobile()
    .save_to_directory(temp, directory, &format!("{stem}.{extension}"), mime_type)
    .await
}

fn toast_id(photo_id: &str) -> String {
  format!("photo_{photo_id}")
}

fn content(message_key: &str, description: Option<(&str, &str)>) -> ToastContent {
  ToastContent {
    message: None,
    description: None,
    message_key: message_key.to_string(),
    message_args: None,
    description_key: description.map(|(key, _)| key.to_string()),
    description_args: description
      .map(|(_, value)| HashMap::from([("value".to_string(), Value::from(value))])),
  }
}

fn show_photo_receiving(photo_id: &str) {
  toast_loading(Some(toast_id(photo_id)), content("toasts_photo_receiving", None), None);
}

fn show_photo_saved(photo_id: &str, location: &str) {
  toast_success(
    Some(toast_id(photo_id)),
    content("toasts_photo_saved", Some(("toasts_photo_detail", location))),
    None,
  );
}

fn show_photo_failed(photo_id: &str, error: &str) {
  toast_error(
    Some(toast_id(photo_id)),
    content("toasts_photo_receive_failed", Some(("toasts_photo_detail", error))),
    None,
  );
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if photo names do not follow the PC's UTC clock.
  #[test]
  fn photo_names_use_the_pc_clock_in_utc() {
    // 2026-11-05 14:03:22 UTC
    let time = UNIX_EPOCH + Duration::from_secs(1_793_887_402);
    assert_eq!(photo_stem(time), "Photo_2026-11-05_14-03-22");
    assert_eq!(photo_stem(UNIX_EPOCH), "Photo_1970-01-01_00-00-00");
    // Leap day.
    assert_eq!(
      photo_stem(UNIX_EPOCH + Duration::from_secs(951_827_696)),
      "Photo_2000-02-29_12-34-56"
    );
  }

  /// # Panics
  /// Panics if a file name could escape the photo folder.
  #[test]
  fn only_camera_files_are_accepted() {
    assert_eq!(extension_of("photo_2026-11-05_14-03-22.jpg"), Ok("jpg"));
    assert_eq!(extension_of("photo_2026-11-05_14-03-22_2.dng"), Ok("dng"));
    assert!(extension_of("../photo_1.jpg").is_err());
    assert!(extension_of("photo_1.txt").is_err());
    assert!(extension_of("other.jpg").is_err());
    assert!(extension_of("photo_1/../../x.jpg").is_err());
  }

  /// # Panics
  /// Panics if the firmware's outbox listing no longer parses.
  #[test]
  fn outbox_listing_matches_the_firmware() {
    let outbox: Result<Outbox, _> = serde_json::from_value(serde_json::json!({
      "ready": [{"id": "photo_1", "files": [
        {"name": "photo_1.jpg", "size": 4},
        {"name": "photo_1.dng", "size": 8}
      ]}],
      "saving": ["photo_3"],
      "failed": [{"id": "photo_4", "error": "Failed to write photo"}]
    }));
    let Ok(outbox) = outbox else {
      panic!("outbox listing parses");
    };
    assert_eq!(outbox.ready[0].files[1].name, "photo_1.dng");
    assert_eq!(outbox.saving, vec!["photo_3"]);
    assert_eq!(outbox.failed[0].error, "Failed to write photo");
  }

  /// # Panics
  /// Panics if saving replaces an existing photo.
  ///
  /// # Errors
  /// Returns file system errors from the test fixture.
  #[cfg(desktop)]
  #[tokio::test]
  async fn saving_never_replaces_an_existing_photo() -> Result<(), Box<dyn std::error::Error>> {
    let folder = tempfile::tempdir()?;
    let directory = folder.path().to_string_lossy().to_string();
    std::fs::write(folder.path().join("Photo_1.jpg"), b"old")?;
    let temp = folder.path().join(".photo_1.jpg.part");
    std::fs::write(&temp, b"new")?;

    let saved = save_into(&temp, &directory, "Photo_1", "jpg").await?;

    assert!(saved.ends_with("Photo_1_2.jpg"));
    assert_eq!(std::fs::read(folder.path().join("Photo_1.jpg"))?, b"old");
    assert_eq!(std::fs::read(folder.path().join("Photo_1_2.jpg"))?, b"new");
    Ok(())
  }
}
