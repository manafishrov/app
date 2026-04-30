use std::io::Read;
use std::path::Path;

use futures_util::StreamExt;
use minisign_verify::{PublicKey, Signature};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::command;
use tokio::io::AsyncWriteExt;
use tokio_util::io::ReaderStream;

const FIRMWARE_MINISIGN_PUBLIC_KEY: &str =
  "RWQ79VrKeNgtcTOSQWqd8vI9zVSZbrzXzuUNUzht6ZpHwRLLnUZPSl8s";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareArtifactSignature {
  pub url: String,
  pub format: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareArtifact {
  pub name: String,
  pub kind: String,
  pub format: String,
  pub url: String,
  pub size: u64,
  pub sha256: String,
  pub signature: Option<FirmwareArtifactSignature>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareOfflineInstall {
  pub system_path: String,
  pub closure_format: String,
  pub import_command: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareSigning {
  pub enabled: bool,
  pub scheme: Option<String>,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareReleaseManifest {
  pub version: String,
  pub product: String,
  pub published_at: String,
  pub release_url: String,
  pub offline_install: FirmwareOfflineInstall,
  pub signing: FirmwareSigning,
  pub artifacts: Vec<FirmwareArtifact>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareManifestRequest {
  pub manifest_url: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareDownloadRequest {
  pub artifact_url: String,
  pub signature_url: String,
  pub file_name: String,
  pub sha256: String,
  pub size: u64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareUploadRequest {
  pub file_path: String,
  pub upload_url: String,
  pub file_name: String,
  pub system_path: String,
}

/// # Errors
/// Returns an error if the request fails or the response body cannot be read.
async fn fetch_bytes(url: &str) -> Result<bytes::Bytes, String> {
  let response = Client::new().get(url).send().await.map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("Request failed with status {status}"));
  }

  response.bytes().await.map_err(|e| e.to_string())
}

/// # Errors
/// Returns an error if the minisign public key or signature is invalid.
fn verify_minisign_bytes(data: &[u8], signature_bytes: &[u8]) -> Result<(), String> {
  let public_key =
    PublicKey::from_base64(FIRMWARE_MINISIGN_PUBLIC_KEY).map_err(|e| e.to_string())?;
  let signature_text = std::str::from_utf8(signature_bytes).map_err(|e| e.to_string())?;
  let signature = Signature::decode(signature_text).map_err(|e| e.to_string())?;
  public_key.verify(data, &signature, false).map_err(|e| e.to_string())
}

/// # Errors
/// Returns an error if the minisign signature cannot be verified for the file.
fn verify_minisign_file(path: &std::path::Path, signature_bytes: &[u8]) -> Result<(), String> {
  let public_key =
    PublicKey::from_base64(FIRMWARE_MINISIGN_PUBLIC_KEY).map_err(|e| e.to_string())?;
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

fn signature_url_for_manifest(manifest_url: &str) -> String {
  format!("{manifest_url}.minisig")
}

fn minisig_path_for(path: &std::path::Path) -> std::path::PathBuf {
  let mut path_with_suffix = path.as_os_str().to_os_string();
  path_with_suffix.push(".minisig");
  std::path::PathBuf::from(path_with_suffix)
}

/// # Errors
/// Returns an error if the value is not valid for an HTTP header.
fn header_value(value: &str, label: &str) -> Result<reqwest::header::HeaderValue, String> {
  reqwest::header::HeaderValue::from_str(value)
    .map_err(|_| format!("Invalid firmware update {label}"))
}

/// # Errors
/// Returns an error if the provided file name is empty or unsafe.
fn sanitize_file_name(file_name: &str) -> Result<String, String> {
  Path::new(file_name)
    .file_name()
    .and_then(|part| part.to_str())
    .map(std::string::ToString::to_string)
    .ok_or_else(|| "Invalid firmware file name".to_string())
}

/// # Errors
/// Returns an error if no writable cache directory can be resolved.
fn resolve_download_path(file_name: &str) -> Result<std::path::PathBuf, String> {
  let base_dir = dirs::cache_dir()
    .or_else(dirs::home_dir)
    .ok_or_else(|| "Failed to resolve a cache directory".to_string())?;
  let target_dir = base_dir.join("Manafish").join("FirmwareUpdates");
  std::fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;
  Ok(target_dir.join(file_name))
}

/// # Errors
/// Returns an error if the target path is an existing symlink.
fn reject_existing_symlink(target_path: &std::path::Path) -> Result<(), String> {
  if !target_path.exists() {
    return Ok(());
  }

  let metadata = std::fs::symlink_metadata(target_path).map_err(|e| e.to_string())?;
  if metadata.file_type().is_symlink() {
    return Err("Refusing to overwrite a symlinked firmware file".to_string());
  }

  Ok(())
}

/// # Errors
/// Returns an error if the artifact download fails or the checksum does not match.
async fn download_file(
  url: &str,
  signature_url: &str,
  target_path: &std::path::Path,
  expected_sha256: &str,
  expected_size: u64,
) -> Result<(), String> {
  reject_existing_symlink(target_path)?;
  let signature_bytes = fetch_bytes(signature_url).await?;

  let response = Client::new().get(url).send().await.map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("Request failed with status {status}"));
  }

  let partial_path = target_path.with_extension("part");
  let _ = tokio::fs::remove_file(&partial_path).await;
  let _ = tokio::fs::remove_file(minisig_path_for(target_path)).await;
  let mut file = tokio::fs::File::create(&partial_path).await.map_err(|e| e.to_string())?;
  let mut stream = response.bytes_stream();
  let mut hasher = Sha256::new();
  let mut bytes_written = 0_u64;

  while let Some(chunk) = stream.next().await {
    let chunk = chunk.map_err(|e| e.to_string())?;
    hasher.update(&chunk);
    bytes_written += u64::try_from(chunk.len()).map_err(|e| e.to_string())?;
    file.write_all(&chunk).await.map_err(|e| e.to_string())?;
  }

  file.flush().await.map_err(|e| e.to_string())?;
  drop(file);

  let actual_sha256 = format!("{:x}", hasher.finalize());
  if actual_sha256 != expected_sha256.to_lowercase() {
    let _ = std::fs::remove_file(&partial_path);
    return Err("Firmware checksum verification failed".to_string());
  }

  if bytes_written != expected_size {
    let _ = std::fs::remove_file(&partial_path);
    return Err("Firmware size verification failed".to_string());
  }

  let signature = signature_bytes.to_vec();
  let verify_path = partial_path.clone();
  tokio::task::spawn_blocking(move || verify_minisign_file(&verify_path, &signature))
    .await
    .map_err(|e| e.to_string())??;

  let _ = tokio::fs::remove_file(target_path).await;
  tokio::fs::rename(&partial_path, target_path).await.map_err(|e| e.to_string())?;
  tokio::fs::write(minisig_path_for(target_path), signature_bytes)
    .await
    .map_err(|e| e.to_string())
}

#[command]
/// # Errors
/// Returns an error if the firmware manifest cannot be fetched or parsed.
pub async fn check_firmware_update(
  payload: FirmwareManifestRequest,
) -> Result<FirmwareReleaseManifest, String> {
  let bytes = fetch_bytes(&payload.manifest_url).await?;
  let signature_bytes = fetch_bytes(&signature_url_for_manifest(&payload.manifest_url)).await?;
  verify_minisign_bytes(&bytes, &signature_bytes)?;
  serde_json::from_slice::<FirmwareReleaseManifest>(&bytes).map_err(|e| e.to_string())
}

#[command]
/// # Errors
/// Returns an error if the firmware artifact cannot be fetched or written.
pub async fn download_firmware_update(payload: FirmwareDownloadRequest) -> Result<String, String> {
  let file_name = sanitize_file_name(&payload.file_name)?;
  let target_path = resolve_download_path(&file_name)?;
  download_file(
    &payload.artifact_url,
    &payload.signature_url,
    &target_path,
    &payload.sha256,
    payload.size,
  )
  .await?;
  Ok(target_path.display().to_string())
}

#[command]
/// # Errors
/// Returns an error if the firmware closure cannot be uploaded to the ROV.
pub async fn upload_firmware_update(payload: FirmwareUploadRequest) -> Result<(), String> {
  let file_name = sanitize_file_name(&payload.file_name)?;
  let file_path = std::path::PathBuf::from(payload.file_path);
  let signature_text = tokio::fs::read_to_string(minisig_path_for(&file_path))
    .await
    .map_err(|e| e.to_string())?;
  let metadata = tokio::fs::metadata(&file_path).await.map_err(|e| e.to_string())?;
  let file = tokio::fs::File::open(&file_path).await.map_err(|e| e.to_string())?;
  let stream = ReaderStream::new(file);

  let response = Client::new()
    .post(payload.upload_url)
    .header(reqwest::header::CONTENT_LENGTH, metadata.len())
    .header("x-firmware-file-name", header_value(&file_name, "file name")?)
    .header("x-firmware-system-path", header_value(&payload.system_path, "system path")?)
    .header(
      "x-firmware-signature",
      header_value(&signature_text.replace('\n', "\\n"), "signature")?,
    )
    .body(reqwest::Body::wrap_stream(stream))
    .send()
    .await
    .map_err(|e| e.to_string())?;

  let status = response.status();
  if !status.is_success() {
    return Err(format!("Firmware upload failed with status {status}"));
  }

  tokio::fs::remove_file(&file_path).await.map_err(|e| e.to_string())?;
  tokio::fs::remove_file(minisig_path_for(&file_path))
    .await
    .map_err(|e| e.to_string())?;

  Ok(())
}
