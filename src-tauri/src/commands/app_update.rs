use reqwest::Client;
use semver::Version;
use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;
use tauri::{AppHandle, command};
use tauri_plugin_updater::UpdaterExt;
use url::Url;

use crate::constants::{APP_REPO_NAME, APP_REPO_OWNER, MAX_PRERELEASES, MAX_STABLE_RELEASES};

#[derive(Deserialize)]
struct GitHubRelease {
  tag_name: String,
  published_at: Option<String>,
  draft: bool,
  prerelease: bool,
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

fn version_from_tag(tag: &str) -> &str {
  tag.strip_prefix('v').unwrap_or(tag)
}

fn manifest_matches_tag(expected: &Version, manifest: &Version) -> bool {
  manifest == expected
    || (!expected.pre.is_empty()
      && manifest.pre.is_empty()
      && manifest.major == expected.major
      && manifest.minor == expected.minor
      && manifest.patch == expected.patch)
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

fn to_app_release(release: GitHubRelease) -> Option<AppRelease> {
  if release.draft {
    return None;
  }
  let version = version_from_tag(&release.tag_name).to_string();
  if Version::parse(&version).is_err() {
    return None;
  }
  let prerelease = release.prerelease;
  let release_notes =
    release.body.map(|body| body.trim().to_string()).filter(|body| !body.is_empty());
  release.published_at.map(|published_at| AppRelease {
    version,
    tag: release.tag_name,
    published_at,
    prerelease,
    release_notes,
  })
}

/// Take the newest `MAX_STABLE_RELEASES` stable and `MAX_PRERELEASES` prerelease
/// versions independently, merged newest-first, so prereleases never hide
/// stable versions.
fn select_releases(all: Vec<GitHubRelease>) -> Vec<AppRelease> {
  let mut stable = Vec::new();
  let mut prerelease = Vec::new();
  for release in all.into_iter().filter_map(to_app_release) {
    if release.prerelease {
      if prerelease.len() < MAX_PRERELEASES {
        prerelease.push(release);
      }
    } else if stable.len() < MAX_STABLE_RELEASES {
      stable.push(release);
    }
    if stable.len() >= MAX_STABLE_RELEASES && prerelease.len() >= MAX_PRERELEASES {
      break;
    }
  }
  let mut selected: Vec<AppRelease> = stable.into_iter().chain(prerelease).collect();
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
  let expected = Version::parse(version_from_tag(&tag)).map_err(|e| e.to_string())?;
  let endpoint = latest_json_url_for_tag(&tag)?;

  let comparator_expected = expected.clone();
  let updater = app
    .updater_builder()
    .endpoints(vec![endpoint])
    .map_err(|e| e.to_string())?
    .version_comparator(move |_current, release| {
      manifest_matches_tag(&comparator_expected, &release.version)
    })
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
  /// Panics if stable manifest matching accepts a different version.
  #[test]
  fn stable_tags_require_an_exact_manifest_version() {
    let expected = Version::parse("1.2.3").expect("test version should be valid");

    assert!(manifest_matches_tag(
      &expected,
      &Version::parse("1.2.3").expect("test version should be valid")
    ));
    assert!(!manifest_matches_tag(
      &expected,
      &Version::parse("1.2.4").expect("test version should be valid")
    ));
  }

  /// # Panics
  /// Panics if prerelease tags do not accept the same release's stable manifest version.
  #[test]
  fn prerelease_tags_accept_release_builds_with_the_same_core_version() {
    let expected = Version::parse("1.2.3-rc2").expect("test version should be valid");

    assert!(manifest_matches_tag(
      &expected,
      &Version::parse("1.2.3-rc2").expect("test version should be valid")
    ));
    assert!(manifest_matches_tag(
      &expected,
      &Version::parse("1.2.3").expect("test version should be valid")
    ));
    assert!(!manifest_matches_tag(
      &expected,
      &Version::parse("1.2.3-rc1").expect("test version should be valid")
    ));
    assert!(!manifest_matches_tag(
      &expected,
      &Version::parse("1.2.4").expect("test version should be valid")
    ));
  }
}
