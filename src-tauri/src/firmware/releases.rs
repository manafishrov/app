use reqwest::Client;
use semver::Version;
use serde::{Deserialize, Serialize};

use crate::constants::{
  ASSETS_MARKER_END, ASSETS_MARKER_START, MAX_PRERELEASES, MAX_STABLE_RELEASES,
};
use crate::version::parse_release_version;

#[derive(Deserialize)]
struct GitHubRelease {
  tag_name: String,
  published_at: Option<String>,
  draft: bool,
  body: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareRelease {
  pub version: String,
  pub published_at: String,
  pub prerelease: bool,
  pub release_notes: Option<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FirmwareReleasesRequest {
  pub repo_url: String,
}

/// Strip the CI-generated artifact-links section (between the asset markers)
/// from a release body, keeping only the changelog.
fn strip_artifacts_section(body: &str) -> String {
  let Some(start) = body.find(ASSETS_MARKER_START) else {
    return body.trim().to_string();
  };
  let before = &body[..start];
  let after = body[start..]
    .find(ASSETS_MARKER_END)
    .map_or("", |offset| &body[start + offset + ASSETS_MARKER_END.len()..]);
  format!("{}\n{}", before.trim(), after.trim()).trim().to_string()
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
  Ok(select_releases(all))
}

/// Convert a single `GitHub` release into a `FirmwareRelease`, dropping drafts
/// and releases without a publish date.
fn to_firmware_release(release: GitHubRelease) -> Option<(Version, FirmwareRelease)> {
  if release.draft {
    return None;
  }
  let parsed = parse_release_version(&release.tag_name)?;
  let prerelease = !parsed.pre.is_empty();
  let release_notes = release
    .body
    .map(|body| strip_artifacts_section(&body))
    .filter(|body| !body.is_empty());
  release.published_at.map(|published_at| {
    (
      parsed,
      FirmwareRelease {
        version: release.tag_name,
        published_at,
        prerelease,
        release_notes,
      },
    )
  })
}

fn select_releases(all: Vec<GitHubRelease>) -> Vec<FirmwareRelease> {
  let mut stable = Vec::new();
  let mut prerelease = Vec::new();
  for release in all.into_iter().filter_map(to_firmware_release) {
    if release.1.prerelease {
      prerelease.push(release);
    } else {
      stable.push(release);
    }
  }
  stable.sort_by(|a, b| b.0.cmp(&a.0));
  stable.truncate(MAX_STABLE_RELEASES);
  prerelease.sort_by(|a, b| b.0.cmp(&a.0));
  prerelease.truncate(MAX_PRERELEASES);
  let mut selected: Vec<FirmwareRelease> =
    stable.into_iter().chain(prerelease).map(|(_, release)| release).collect();
  selected.sort_by(|a, b| b.published_at.cmp(&a.published_at));
  selected
}
