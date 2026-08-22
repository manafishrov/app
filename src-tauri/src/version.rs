use semver::Version;

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
