use reqwest::Client;
use semver::Version;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, command};
use tauri_plugin_updater::UpdaterExt;
use url::Url;

use crate::constants::{APP_REPO_NAME, APP_REPO_OWNER, MAX_PRERELEASES, MAX_STABLE_RELEASES};
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
pub struct AppRelease {
  pub version: String,
  pub tag: String,
  pub published_at: String,
  pub prerelease: bool,
  pub release_notes: Option<String>,
}

/// Mirrors `@tauri-apps/plugin-updater`'s `DownloadEvent` so the frontend reuses
/// the same progress handler as the default update flow.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "event", content = "data")]
pub enum InstallProgress {
  Started { content_length: Option<u64> },
  Progress { chunk_length: usize },
  Finished,
}

fn releases_api_url() -> String {
  format!("https://api.github.com/repos/{APP_REPO_OWNER}/{APP_REPO_NAME}/releases?per_page=100")
}

/// # Errors
/// Returns an error if the base URL cannot be parsed or extended.
fn latest_json_url_for_tag(tag: &str) -> Result<Url, String> {
  let mut url = Url::parse(&format!(
    "https://github.com/{APP_REPO_OWNER}/{APP_REPO_NAME}/releases/download/"
  ))
  .map_err(|e| e.to_string())?;
  url
    .path_segments_mut()
    .map_err(|()| "Invalid base URL".to_string())?
    .push(tag)
    .push("latest.json");
  Ok(url)
}

/// # Errors
/// Returns an error if the `GitHub` releases cannot be fetched or parsed.
#[command]
pub async fn fetch_app_releases() -> Result<Vec<AppRelease>, String> {
  let client = Client::new();
  let response = client
    .get(releases_api_url())
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

fn to_app_release(release: GitHubRelease) -> Option<(Version, AppRelease)> {
  if release.draft {
    return None;
  }
  let parsed = parse_release_version(&release.tag_name)?;
  let version = parsed.to_string();
  let prerelease = !parsed.pre.is_empty();
  let release_notes =
    release.body.map(|body| body.trim().to_string()).filter(|body| !body.is_empty());
  release.published_at.map(|published_at| {
    (
      parsed,
      AppRelease {
        version,
        tag: release.tag_name,
        published_at,
        prerelease,
        release_notes,
      },
    )
  })
}

/// Take the newest `MAX_STABLE_RELEASES` stable and `MAX_PRERELEASES` prerelease
/// versions independently, merged newest-first, so prereleases never hide
/// stable versions.
fn select_releases(all: Vec<GitHubRelease>) -> Vec<AppRelease> {
  let mut stable = Vec::new();
  let mut prerelease = Vec::new();
  for release in all.into_iter().filter_map(to_app_release) {
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
  let mut selected: Vec<AppRelease> =
    stable.into_iter().chain(prerelease).map(|(_, release)| release).collect();
  selected.sort_by(|a, b| b.published_at.cmp(&a.published_at));
  selected
}

/// # Errors
/// Returns an error if the tag is not valid semver, the updater cannot be built,
/// the release manifest does not match the requested version, or the download or
/// install fails.
#[command]
pub async fn install_app_release(
  app: AppHandle,
  tag: String,
  on_progress: Channel<InstallProgress>,
) -> Result<(), String> {
  let expected = parse_release_version(&tag)
    .ok_or_else(|| format!("Release tag {tag} is not a supported SemVer version"))?;
  let endpoint = latest_json_url_for_tag(&tag)?;

  let comparator_expected = expected.clone();
  let updater = app
    .updater_builder()
    .endpoints(vec![endpoint])
    .map_err(|e| e.to_string())?
    .version_comparator(move |_current, release| release.version == comparator_expected)
    .build()
    .map_err(|e| e.to_string())?;

  let update = updater
    .check()
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| format!("Release manifest for {tag} does not match version {expected}"))?;

  let progress = on_progress.clone();
  let mut started = false;
  update
    .download_and_install(
      move |chunk_length, content_length| {
        if !started {
          started = true;
          let _ = progress.send(InstallProgress::Started { content_length });
        }
        let _ = progress.send(InstallProgress::Progress { chunk_length });
      },
      move || {
        let _ = on_progress.send(InstallProgress::Finished);
      },
    )
    .await
    .map_err(|e| e.to_string())?;

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if release tags and updater manifests do not require exact identity.
  #[test]
  fn release_versions_require_canonical_rc_identity() {
    assert!(parse_release_version("v1.2.3").is_some());
    assert!(parse_release_version("v1.2.3-rc.2").is_some());
    assert!(parse_release_version("v1.2.3-beta.2").is_some());
    assert!(parse_release_version("v1.2.3-rc2").is_none());
    assert!(parse_release_version("v1.2.3-rc-2").is_none());
    assert!(parse_release_version("v1.2.3-rc.02").is_none());
    assert!(parse_release_version("v1.2.3-RC.2").is_none());
  }
}
