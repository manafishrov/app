use std::io::Read;
use std::path::{Path, PathBuf};

use futures_util::StreamExt;
use minisign_verify::{PublicKey, Signature};
use reqwest::Client;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncWriteExt;

const FIRMWARE_PUBLIC_KEY: &str = "RWQ79VrKeNgtcTOSQWqd8vI9zVSZbrzXzuUNUzht6ZpHwRLLnUZPSl8s";
const DOWNLOAD_PROGRESS_EVENT: &str = "firmware_download_progress";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
  phase: String,
  percent: u8,
  bytes_done: u64,
  total_bytes: u64,
}

fn percent_of(done: u64, total: u64) -> u8 {
  if total == 0 {
    return 0;
  }
  let raw = done.saturating_mul(100) / total;
  u8::try_from(raw.min(100)).unwrap_or(100)
}

fn emit_progress(app: &AppHandle, phase: &str, bytes_done: u64, total_bytes: u64) {
  let _ = app.emit(
    DOWNLOAD_PROGRESS_EVENT,
    DownloadProgress {
      phase: phase.to_string(),
      percent: percent_of(bytes_done, total_bytes),
      bytes_done,
      total_bytes,
    },
  );
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareDownloadRequest {
  pub artifact_url: String,
  pub signature_url: Option<String>,
  pub file_name: String,
  pub sha256: String,
  pub size: u64,
}

fn signature_path_for(image_path: &Path) -> PathBuf {
  let mut buffer = image_path.as_os_str().to_os_string();
  buffer.push(".minisig");
  PathBuf::from(buffer)
}

fn sanitize_file_name(file_name: &str) -> Result<String, String> {
  Path::new(file_name)
    .file_name()
    .and_then(|part| part.to_str())
    .map(std::string::ToString::to_string)
    .ok_or_else(|| "Invalid firmware file name".to_string())
}

fn resolve_download_path(file_name: &str) -> Result<PathBuf, String> {
  let base_dir = dirs::cache_dir()
    .or_else(dirs::home_dir)
    .ok_or_else(|| "Failed to resolve a cache directory".to_string())?;
  let target_dir = base_dir.join("Manafish").join("FirmwareUpdates");
  std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
  Ok(target_dir.join(file_name))
}

fn reject_existing_symlink(target_path: &Path) -> Result<(), String> {
  if !target_path.exists() {
    return Ok(());
  }
  let metadata = std::fs::symlink_metadata(target_path).map_err(|e| e.to_string())?;
  if metadata.file_type().is_symlink() {
    return Err("Refusing to overwrite a symlinked firmware file".to_string());
  }
  Ok(())
}

fn verify_minisign_file(path: &Path, signature_bytes: &[u8]) -> Result<(), String> {
  let public_key = PublicKey::from_base64(FIRMWARE_PUBLIC_KEY).map_err(|e| e.to_string())?;
  let signature_text = std::str::from_utf8(signature_bytes).map_err(|e| e.to_string())?;
  let signature = Signature::decode(signature_text).map_err(|e| e.to_string())?;
  let mut verifier = public_key.verify_stream(&signature).map_err(|e| e.to_string())?;
  let mut file = std::fs::File::open(path).map_err(|e| e.to_string())?;
  let mut buffer = vec![0_u8; 64 * 1024];
  loop {
    let bytes_read = file.read(&mut buffer).map_err(|e| e.to_string())?;
    if bytes_read == 0 {
      break;
    }
    verifier.update(&buffer[..bytes_read]);
  }
  verifier.finalize().map_err(|e| e.to_string())
}

async fn fetch_signature(client: &Client, signature_url: Option<&str>) -> Result<Vec<u8>, String> {
  let Some(url) = signature_url else {
    return Err("Manifest is missing a signature url for the firmware artifact".to_string());
  };
  let response = client.get(url).send().await.map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("Signature download failed with status {status}"));
  }
  Ok(response.bytes().await.map_err(|e| e.to_string())?.to_vec())
}

/// # Errors
/// Returns an error if the firmware artifact cannot be downloaded or verified.
pub async fn download_firmware(
  app: &AppHandle,
  payload: FirmwareDownloadRequest,
) -> Result<PathBuf, String> {
  let file_name = sanitize_file_name(&payload.file_name)?;
  let target_path = resolve_download_path(&file_name)?;
  reject_existing_symlink(&target_path)?;

  let client = Client::new();
  let signature_bytes = fetch_signature(&client, payload.signature_url.as_deref()).await?;

  emit_progress(app, "downloading", 0, payload.size);
  let response = client.get(&payload.artifact_url).send().await.map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("Artifact download failed with status {status}"));
  }

  let partial_path = target_path.with_extension("part");
  let _ = tokio::fs::remove_file(&partial_path).await;
  let _ = tokio::fs::remove_file(signature_path_for(&target_path)).await;

  let mut file = tokio::fs::File::create(&partial_path).await.map_err(|e| e.to_string())?;
  let mut stream = response.bytes_stream();
  let mut hasher = Sha256::new();
  let mut bytes_written: u64 = 0;
  let mut last_percent: u8 = 0;

  while let Some(chunk_result) = stream.next().await {
    let chunk = chunk_result.map_err(|e| e.to_string())?;
    hasher.update(&chunk);
    bytes_written += u64::try_from(chunk.len()).map_err(|e| e.to_string())?;
    file.write_all(&chunk).await.map_err(|e| e.to_string())?;
    let percent = percent_of(bytes_written, payload.size);
    if percent != last_percent {
      last_percent = percent;
      emit_progress(app, "downloading", bytes_written, payload.size);
    }
  }

  file.flush().await.map_err(|e| e.to_string())?;
  drop(file);

  let actual_sha256 = format!("{:x}", hasher.finalize());
  if actual_sha256 != payload.sha256.to_lowercase() {
    let _ = std::fs::remove_file(&partial_path);
    return Err("Firmware checksum verification failed".to_string());
  }

  if bytes_written != payload.size {
    let _ = std::fs::remove_file(&partial_path);
    return Err("Firmware size verification failed".to_string());
  }

  emit_progress(app, "verifying", bytes_written, payload.size);
  let signature_for_verify = signature_bytes.clone();
  let path_for_verify = partial_path.clone();
  tokio::task::spawn_blocking(move || {
    verify_minisign_file(&path_for_verify, &signature_for_verify)
  })
  .await
  .map_err(|e| e.to_string())??;

  let _ = tokio::fs::remove_file(&target_path).await;
  tokio::fs::rename(&partial_path, &target_path)
    .await
    .map_err(|e| e.to_string())?;
  tokio::fs::write(signature_path_for(&target_path), &signature_bytes)
    .await
    .map_err(|e| e.to_string())?;

  emit_progress(app, "completed", payload.size, payload.size);
  Ok(target_path)
}
