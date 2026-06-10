use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::constants::MAX_RELEASES;

#[derive(Deserialize)]
struct GitHubRelease {
  tag_name: String,
  published_at: Option<String>,
  draft: bool,
  prerelease: bool,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareRelease {
  pub version: String,
  pub published_at: String,
  pub prerelease: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareReleasesRequest {
  pub repo_url: String,
}

/// # Errors
///
/// Returns an error if the repository URL is not a supported `GitHub`
/// repository URL.
fn api_url_from_repo(repo_url: &str) -> Result<String, String> {
  let trimmed = repo_url.trim_end_matches('/');
  let path = trimmed
    .strip_prefix("https://github.com/")
    .ok_or_else(|| format!("Unsupported repo URL: {repo_url}"))?;
  Ok(format!("https://api.github.com/repos/{path}/releases"))
}

/// # Errors
/// Returns an error if the `GitHub` releases cannot be fetched or parsed.
pub async fn fetch_releases(repo_url: &str) -> Result<Vec<FirmwareRelease>, String> {
  let url = api_url_from_repo(repo_url)?;
  let client = Client::new();
  let response = client
    .get(&url)
    .header("Accept", "application/vnd.github+json")
    .header("User-Agent", "manafish")
    .send()
    .await
    .map_err(|e| e.to_string())?;
  let status = response.status();
  if !status.is_success() {
    return Err(format!("GitHub API returned status {status}"));
  }
  let all: Vec<GitHubRelease> = response.json().await.map_err(|e| e.to_string())?;
  let releases: Vec<FirmwareRelease> = all
    .into_iter()
    .filter(|release| !release.draft)
    .take(MAX_RELEASES)
    .filter_map(|release| {
      let prerelease = release.prerelease;
      release.published_at.map(|published_at| FirmwareRelease {
        version: release.tag_name,
        published_at,
        prerelease,
      })
    })
    .collect();
  Ok(releases)
}
