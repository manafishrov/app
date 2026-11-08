//! Curated, versioned ONNX downloads. URLs and hashes come from the application,
//! never from IPC callers.

use std::collections::{HashMap, hash_map::Entry};
use std::fmt::Write as _;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;
use tokio_util::sync::CancellationToken;

use super::library::{self, DetectionModelInfo};

const CANCELLED: &str = "Model download cancelled";
const MAX_MODEL_BYTES: u64 = 512 * 1024 * 1024;

fn hex_digest(bytes: &[u8]) -> String {
  bytes.iter().fold(String::new(), |mut hex, byte| {
    let _ = write!(hex, "{byte:02x}");
    hex
  })
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogAsset {
  pub file_name: String,
  pub file_size: u64,
  pub sha256: String,
  pub url: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogModel {
  pub id: String,
  pub name: String,
  pub license: String,
  pub source_url: String,
  pub experimental: bool,
  pub asset: Option<CatalogAsset>,
}

/// # Errors
/// Returns an error if the compiled catalog is malformed.
pub fn list() -> Result<Vec<CatalogModel>, String> {
  serde_json::from_str(include_str!("catalog.json")).map_err(|error| error.to_string())
}

#[derive(Clone, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DownloadProgress {
  #[serde(rename_all = "camelCase")]
  Downloading {
    downloaded_bytes: u64,
    total_bytes: u64,
  },
  Validating,
}

#[derive(Default)]
pub struct ModelDownloads {
  active: Mutex<HashMap<String, CancellationToken>>,
}

struct ActiveDownload<'a> {
  downloads: &'a ModelDownloads,
  id: &'a str,
}

impl Drop for ActiveDownload<'_> {
  fn drop(&mut self) {
    if let Ok(mut active) = self.downloads.active.lock() {
      active.remove(self.id);
    }
  }
}

impl ModelDownloads {
  /// # Errors
  /// Returns an error if the download state is unavailable.
  pub fn cancel(&self, id: &str) -> Result<(), String> {
    if let Some(token) = self.active.lock().map_err(|error| error.to_string())?.get(id) {
      token.cancel();
    }
    Ok(())
  }

  /// Downloads a pinned asset, then runs the same validation as a custom import.
  ///
  /// # Errors
  /// Rejects unknown/unavailable models, duplicate downloads, cancellation,
  /// network errors, incorrect content, and unsupported ONNX models.
  pub async fn install(
    &self,
    id: &str,
    progress: impl Fn(DownloadProgress) + Send + Sync,
  ) -> Result<DetectionModelInfo, String> {
    self.install_into(id, library::models_dir()?, progress).await
  }

  /// # Errors
  /// Returns an error for unavailable models, failed transfers or validation.
  async fn install_into(
    &self,
    id: &str,
    directory: PathBuf,
    progress: impl Fn(DownloadProgress) + Send + Sync,
  ) -> Result<DetectionModelInfo, String> {
    let model = list()?
      .into_iter()
      .find(|model| model.id == id)
      .ok_or_else(|| "Unknown catalog model".to_string())?;
    let asset = model
      .asset
      .ok_or_else(|| "This model is not available to download yet".to_string())?;
    if asset.url.is_none() {
      return Err("This model is not available to download yet".to_string());
    }

    let token = CancellationToken::new();
    {
      let mut active = self.active.lock().map_err(|error| error.to_string())?;
      match active.entry(id.to_string()) {
        Entry::Occupied(_) => return Err("This model is already downloading".to_string()),
        Entry::Vacant(entry) => entry.insert(token.clone()),
      };
    }
    let _active = ActiveDownload {
      downloads: self,
      id,
    };
    let client = reqwest::Client::builder()
      .https_only(true)
      .connect_timeout(Duration::from_secs(30))
      .read_timeout(Duration::from_secs(30))
      .timeout(Duration::from_mins(30));
    // reqwest's platform verifier needs JVM setup on Android that the app does
    // not do, and panics without it, so verify against bundled Mozilla roots.
    #[cfg(target_os = "android")]
    let client = client.tls_certs_only(
      webpki_root_certs::TLS_SERVER_ROOT_CERTS
        .iter()
        .map(|cert| reqwest::Certificate::from_der(cert))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?,
    );
    let client = client.build().map_err(|error| error.to_string())?;
    tokio::fs::create_dir_all(&directory).await.map_err(|error| error.to_string())?;
    let staged = receive(&client, &asset, &directory, &token, &progress).await?;
    if token.is_cancelled() {
      return Err(CANCELLED.to_string());
    }
    progress(DownloadProgress::Validating);
    tauri::async_runtime::spawn_blocking(move || {
      // Keep the temporary file alive through validation and installation.
      library::import_download(staged.path(), &model.name, &token, &directory)
    })
    .await
    .map_err(|error| error.to_string())?
  }
}

/// # Errors
/// Returns an error if cancelled or if receiving and verifying the asset fails.
async fn receive(
  client: &reqwest::Client,
  asset: &CatalogAsset,
  directory: &Path,
  cancellation: &CancellationToken,
  progress: &impl Fn(DownloadProgress),
) -> Result<NamedTempFile, String> {
  tokio::select! {
    biased;
    () = cancellation.cancelled() => Err(CANCELLED.to_string()),
    result = receive_inner(client, asset, directory, progress) => result,
  }
}

/// # Errors
/// Returns an error for HTTP, filesystem, byte count, or integrity failures.
async fn receive_inner(
  client: &reqwest::Client,
  asset: &CatalogAsset,
  directory: &Path,
  progress: &impl Fn(DownloadProgress),
) -> Result<NamedTempFile, String> {
  if asset.file_size == 0 || asset.file_size > MAX_MODEL_BYTES {
    return Err("Invalid model download size".to_string());
  }
  let url = asset.url.as_deref().ok_or_else(|| "Model download unavailable".to_string())?;
  let response = client.get(url).send().await.map_err(|error| error.to_string())?;
  let response = response.error_for_status().map_err(|error| error.to_string())?;
  if response.content_length().is_some_and(|size| size != asset.file_size) {
    return Err("The model download size has changed".to_string());
  }
  // Android before 13 does not set $TMPDIR for apps, so the default temporary
  // directory is not writable there. Stage next to the library instead.
  let staged = NamedTempFile::new_in(directory).map_err(|error| error.to_string())?;
  let mut file = tokio::fs::File::from_std(staged.reopen().map_err(|error| error.to_string())?);
  let mut stream = response.bytes_stream();
  let mut downloaded = 0_u64;
  let mut hash = Sha256::new();
  let mut last_progress = Instant::now();
  progress(DownloadProgress::Downloading {
    downloaded_bytes: 0,
    total_bytes: asset.file_size,
  });
  while let Some(chunk) = stream.next().await {
    let chunk = chunk.map_err(|error| error.to_string())?;
    downloaded += chunk.len() as u64;
    if downloaded > asset.file_size {
      return Err("The model download exceeds its expected size".to_string());
    }
    hash.update(&chunk);
    file.write_all(&chunk).await.map_err(|error| error.to_string())?;
    if last_progress.elapsed() >= Duration::from_millis(100) {
      progress(DownloadProgress::Downloading {
        downloaded_bytes: downloaded,
        total_bytes: asset.file_size,
      });
      last_progress = Instant::now();
    }
  }
  if downloaded != asset.file_size {
    return Err("The model download is incomplete".to_string());
  }
  if hex_digest(&hash.finalize()) != asset.sha256 {
    return Err("The model download failed its SHA-256 integrity check".to_string());
  }
  file.flush().await.map_err(|error| error.to_string())?;
  drop(file);
  progress(DownloadProgress::Downloading {
    downloaded_bytes: downloaded,
    total_bytes: asset.file_size,
  });
  Ok(staged)
}

#[cfg(test)]
mod tests {
  #![allow(clippy::missing_panics_doc, clippy::missing_errors_doc)]

  use std::collections::HashSet;
  use std::io::Read;

  use tokio::io::{AsyncReadExt, AsyncWriteExt};
  use tokio::net::TcpListener;

  use super::*;

  const CONTENT: &[u8] = b"a downloaded model";

  #[test]
  fn progress_uses_the_frontend_channel_contract() -> Result<(), String> {
    let progress = DownloadProgress::Downloading {
      downloaded_bytes: 25,
      total_bytes: 100,
    };
    assert_eq!(
      serde_json::to_value(progress).map_err(|error| error.to_string())?,
      serde_json::json!({ "type": "downloading", "downloadedBytes": 25, "totalBytes": 100 })
    );
    assert_eq!(
      serde_json::to_value(DownloadProgress::Validating).map_err(|error| error.to_string())?,
      serde_json::json!({ "type": "validating" })
    );
    Ok(())
  }

  async fn serve(response: String) -> Result<(String, tokio::task::JoinHandle<()>), String> {
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|error| error.to_string())?;
    let address = listener.local_addr().map_err(|error| error.to_string())?;
    let server = tokio::spawn(async move {
      if let Ok((mut socket, _)) = listener.accept().await {
        let mut request = [0_u8; 2048];
        let _ = socket.read(&mut request).await;
        let _ = socket.write_all(response.as_bytes()).await;
      }
    });
    Ok((format!("http://{address}/model.onnx"), server))
  }

  fn asset(url: String) -> CatalogAsset {
    CatalogAsset {
      file_name: "test.onnx".to_string(),
      file_size: CONTENT.len() as u64,
      sha256: hex_digest(&Sha256::digest(CONTENT)),
      url: Some(url),
    }
  }

  fn response(content: &str) -> String {
    format!(
      "HTTP/1.1 200 OK\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{content}",
      content.len()
    )
  }

  #[test]
  fn catalog_has_exactly_the_approved_models_and_valid_pins() -> Result<(), String> {
    let pin: serde_json::Value =
      serde_json::from_str(include_str!("../../../scripts/detection-catalog-pin.json"))
        .map_err(|error| error.to_string())?;
    assert_eq!(pin["sha256"], hex_digest(&Sha256::digest(include_bytes!("catalog.json"))));
    let release = pin["version"].as_str().ok_or("Missing catalog release pin")?;
    let models = list()?;
    let ids: HashSet<_> = models.iter().map(|model| model.id.as_str()).collect();
    assert_eq!(
      ids,
      HashSet::from([
        "yolo26n", "yolo26s", "yolo26m", "yolo11n", "yolo11s", "marine-fishinv",
        "marine-megafauna",
      ])
    );
    assert_eq!(models.len(), ids.len());
    for model in models {
      assert!(model.source_url.starts_with("https://"));
      let asset = model.asset.ok_or("Missing released model asset")?;
      assert_eq!(asset.sha256.len(), 64);
      assert!(asset.sha256.bytes().all(|byte| byte.is_ascii_hexdigit()));
      assert!(asset.file_size > 0 && asset.file_size <= MAX_MODEL_BYTES);
      assert_eq!(
        asset.url,
        Some(format!(
          "https://github.com/manafishrov/detection-models/releases/download/{release}/{}",
          asset.file_name
        ))
      );
    }
    Ok(())
  }

  #[tokio::test]
  async fn receives_verified_bytes_and_removes_staging_file_on_drop() -> Result<(), String> {
    let (url, server) =
      serve(response(std::str::from_utf8(CONTENT).map_err(|error| error.to_string())?)).await?;
    let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
    let file = receive(
      &reqwest::Client::new(),
      &asset(url),
      directory.path(),
      &CancellationToken::new(),
      &|_| {},
    )
    .await?;
    let path = file.path().to_path_buf();
    assert_eq!(path.parent(), Some(directory.path()));
    assert_eq!(std::fs::read(&path).map_err(|error| error.to_string())?, CONTENT);
    drop(file);
    assert!(!path.exists());
    server.await.map_err(|error| error.to_string())?;
    Ok(())
  }

  #[tokio::test]
  async fn rejects_corruption_changed_sizes_and_http_errors() -> Result<(), String> {
    let cases = [
      response("a corrupted  model"),
      response("too short"),
      "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n".to_string(),
      // No content length: enforce the pin while streaming, too.
      "HTTP/1.1 200 OK\r\nConnection: close\r\n\r\nmore bytes than the expected model size"
        .to_string(),
      "HTTP/1.1 200 OK\r\nConnection: close\r\n\r\nshort".to_string(),
    ];
    let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
    for response in cases {
      let (url, server) = serve(response).await?;
      assert!(
        receive(
          &reqwest::Client::new(),
          &asset(url),
          directory.path(),
          &CancellationToken::new(),
          &|_| {},
        )
        .await
        .is_err()
      );
      server.await.map_err(|error| error.to_string())?;
    }
    let leftovers = std::fs::read_dir(directory.path()).map_err(|error| error.to_string())?;
    assert_eq!(leftovers.count(), 0);
    Ok(())
  }

  #[tokio::test]
  async fn cancels_a_connection_waiting_for_headers() -> Result<(), String> {
    let listener = TcpListener::bind("127.0.0.1:0").await.map_err(|error| error.to_string())?;
    let address = listener.local_addr().map_err(|error| error.to_string())?;
    let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
    let cancellation = CancellationToken::new();
    let cancel = cancellation.clone();
    let server = tokio::spawn(async move {
      let _connection = listener.accept().await;
      cancel.cancel();
      std::future::pending::<()>().await;
    });
    let result = tokio::time::timeout(
      Duration::from_secs(2),
      receive(
        &reqwest::Client::new(),
        &asset(format!("http://{address}/model.onnx")),
        directory.path(),
        &cancellation,
        &|_| {},
      ),
    )
    .await
    .map_err(|error| error.to_string())?;
    assert_eq!(result.err().as_deref(), Some(CANCELLED));
    server.abort();
    Ok(())
  }

  #[test]
  fn active_download_guard_releases_the_id_for_retry() -> Result<(), String> {
    let downloads = ModelDownloads::default();
    let token = CancellationToken::new();
    downloads
      .active
      .lock()
      .map_err(|error| error.to_string())?
      .insert("test".into(), token.clone());
    {
      let _active = ActiveDownload {
        downloads: &downloads,
        id: "test",
      };
      downloads.cancel("test")?;
      assert!(token.is_cancelled());
    }
    assert!(downloads.active.lock().map_err(|error| error.to_string())?.is_empty());
    Ok(())
  }

  #[test]
  #[ignore = "Requires MANA_FISH_TEST_MODELS pointing to the catalog ONNX files"]
  fn real_catalog_assets_match_pins_and_run_on_cpu() -> Result<(), String> {
    let directory = std::env::var("MANA_FISH_TEST_MODELS").map_err(|error| error.to_string())?;
    for model in list()? {
      let Some(asset) = model.asset else {
        continue;
      };
      let path = std::path::Path::new(&directory).join(&asset.file_name);
      let mut file = std::fs::File::open(&path).map_err(|error| error.to_string())?;
      let mut bytes = Vec::new();
      file.read_to_end(&mut bytes).map_err(|error| error.to_string())?;
      assert_eq!(bytes.len() as u64, asset.file_size, "{} size", model.id);
      assert_eq!(hex_digest(&Sha256::digest(&bytes)), asset.sha256, "{} hash", model.id);
      let (mut loaded, _) = super::super::model::DetectionModel::load(
        &path,
        super::super::model::ExecutionProviderPreference::Cpu,
      )?;
      loaded.validate()?;
    }
    Ok(())
  }

  #[tokio::test]
  #[ignore = "Downloads and validates all seven catalog models from their public URLs"]
  async fn downloads_and_installs_all_catalog_models_into_an_isolated_library() -> Result<(), String>
  {
    let directory = tempfile::tempdir().map_err(|error| error.to_string())?;
    let downloads = ModelDownloads::default();
    for model in list()? {
      let asset = model.asset.ok_or_else(|| format!("{} has no asset", model.id))?;
      assert!(asset.url.is_some(), "{} has no download URL", model.id);
      let installed = downloads
        .install_into(&model.id, directory.path().to_path_buf(), |_| {})
        .await?;
      assert_eq!(installed.id, asset.sha256[..16], "{} installed hash", model.id);
      assert_eq!(installed.file_size, asset.file_size, "{} installed size", model.id);
      assert_eq!(installed.name, model.name);
      assert!(!installed.description.classes.is_empty(), "{} class metadata", model.id);
      let metadata = directory.path().join(format!("{}.json", installed.id));
      let saved: DetectionModelInfo =
        serde_json::from_slice(&std::fs::read(metadata).map_err(|error| error.to_string())?)
          .map_err(|error| error.to_string())?;
      assert_eq!(saved.id, installed.id);
      assert!(directory.path().join(format!("{}.onnx", installed.id)).is_file());
    }
    Ok(())
  }
}
