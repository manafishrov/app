use semver::{BuildMetadata, Version};

fn version_from_git_describe(description: &str) -> Option<Version> {
  let (description, dirty) = description
    .strip_suffix("-dirty")
    .map_or((description, false), |clean| (clean, true));
  let (tag_and_commits, commit_hash) = description.rsplit_once('-')?;
  let (tag, commits) = tag_and_commits.rsplit_once('-')?;
  let commit_count = commits.parse::<u64>().ok()?;
  let commit_hash = commit_hash.strip_prefix('g')?;
  if commit_hash.is_empty() || !commit_hash.bytes().all(|byte| byte.is_ascii_hexdigit()) {
    return None;
  }

  let mut version = Version::parse(version_from_tag(tag)).ok()?;
  if commit_count == 0 && !dirty {
    return Some(version);
  }

  let mut build = Vec::new();
  if !version.build.is_empty() {
    build.push(version.build.as_str().to_string());
  }
  build.push(commit_count.to_string());
  build.push(format!("g{commit_hash}"));
  if dirty {
    build.push("dirty".to_string());
  }
  version.build = BuildMetadata::new(&build.join(".")).ok()?;
  Some(version)
}

pub(crate) fn current_app_version() -> String {
  option_env!("MANAFISH_GIT_DESCRIBE")
    .and_then(version_from_git_describe)
    .map_or_else(|| env!("CARGO_PKG_VERSION").to_string(), |version| version.to_string())
}

fn version_from_tag(tag: &str) -> &str {
  tag.strip_prefix('v').unwrap_or(tag)
}

fn is_canonical_release_candidate(version: &Version) -> bool {
  let prerelease = version.pre.as_str();
  if !prerelease.to_ascii_lowercase().starts_with("rc") {
    return true;
  }
  let Some(number) = prerelease.strip_prefix("rc.") else {
    return false;
  };
  !number.is_empty()
    && !number.starts_with('0')
    && number.bytes().all(|character| character.is_ascii_digit())
}

pub(crate) fn parse_release_version(tag: &str) -> Option<Version> {
  let version = Version::parse(version_from_tag(tag)).ok()?;
  is_canonical_release_candidate(&version).then_some(version)
}

#[cfg(test)]
mod tests {
  use super::*;

  /// # Panics
  /// Panics if development builds cannot express their nearest release and
  /// commit distance as valid `SemVer`.
  #[test]
  fn development_version_uses_release_ancestry() {
    assert_eq!(
      version_from_git_describe("v1.0.17-rc.7-4-ge6196a8").map(|version| version.to_string()),
      Some("1.0.17-rc.7+4.ge6196a8".to_string())
    );
    assert_eq!(
      version_from_git_describe("v1.0.17-rc.7-0-g405a6d3").map(|version| version.to_string()),
      Some("1.0.17-rc.7".to_string())
    );
    assert_eq!(
      version_from_git_describe("v1.0.17-rc.7-4-ge6196a8-dirty").map(|version| version.to_string()),
      Some("1.0.17-rc.7+4.ge6196a8.dirty".to_string())
    );
    assert!(version_from_git_describe("not-a-version").is_none());
  }
}
