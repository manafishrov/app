use minisign_verify::{PublicKey, Signature};
use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::constants::SIGNING_PUBLIC_KEY;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareArtifactSignature {
  pub url: String,
  pub format: String,
}

#[derive(Serialize, Deserialize, Clone)]
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

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareSigning {
  pub enabled: bool,
  pub scheme: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareReleaseManifest {
  pub version: String,
  pub product: String,
  pub published_at: String,
  pub release_url: String,
  pub signing: FirmwareSigning,
  pub artifacts: Vec<FirmwareArtifact>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareManifestRequest {
  pub manifest_url: String,
}

/// # Errors
///
/// Returns an error if the request fails, returns a non-success status, or the
/// response body cannot be read.
async fn fetch_bytes(client: &Client, url: &str) -> Result<bytes::Bytes, String> {
  let response = client.get(url).send().await.map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("Request failed with status {status}"));
  }
  response.bytes().await.map_err(|e| e.to_string())
}

fn signature_url_for_manifest(manifest_url: &str) -> String {
  format!("{manifest_url}.minisig")
}

/// # Errors
///
/// Returns an error if the signing key or signature is invalid, or the bytes do
/// not verify against the minisign signature.
fn verify_minisign_bytes(data: &[u8], signature_bytes: &[u8]) -> Result<(), String> {
  let public_key = PublicKey::from_base64(SIGNING_PUBLIC_KEY).map_err(|e| e.to_string())?;
  let signature_text = std::str::from_utf8(signature_bytes).map_err(|e| e.to_string())?;
  let signature = Signature::decode(signature_text).map_err(|e| e.to_string())?;
  public_key.verify(data, &signature, false).map_err(|e| e.to_string())
}

/// # Errors
/// Returns an error if the manifest cannot be fetched, verified, or parsed.
pub async fn fetch_manifest(manifest_url: &str) -> Result<FirmwareReleaseManifest, String> {
  let client = Client::new();
  let manifest_bytes = fetch_bytes(&client, manifest_url).await?;
  let signature_bytes = fetch_bytes(&client, &signature_url_for_manifest(manifest_url)).await?;
  verify_minisign_bytes(&manifest_bytes, &signature_bytes)?;
  serde_json::from_slice::<FirmwareReleaseManifest>(&manifest_bytes).map_err(|e| e.to_string())
}
