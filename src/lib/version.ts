type PrereleaseIdentifier = number | string;

type ParsedVersion = {
  numbers: [number, number, number];
  prerelease: PrereleaseIdentifier[];
};

const VERSION_GREATER_THAN = 1;
const VERSION_LESS_THAN = -1;
const VERSION_PARTS = 3;
const STRICT_SEMVER_PATTERN =
  /^v?(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+(?<build>[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const RELEASE_CANDIDATE_PATTERN = /^rc\.[1-9]\d*$/;

export const formatVersionForDisplay = (version: string): string => {
  const trimmed = version.trim();
  const [releaseVersion = trimmed] = trimmed.split('+', 1);
  if (
    releaseVersion === '' ||
    releaseVersion.toUpperCase() === 'N/A' ||
    releaseVersion.startsWith('v')
  ) {
    return releaseVersion;
  }
  return `v${releaseVersion}`;
};

const compareNumberParts = (left: ParsedVersion, right: ParsedVersion): number => {
  for (let index = 0; index < VERSION_PARTS; index += 1) {
    const leftPart = left.numbers[index] ?? 0;
    const rightPart = right.numbers[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart > rightPart ? VERSION_GREATER_THAN : VERSION_LESS_THAN;
    }
  }

  return 0;
};

const comparePrereleaseIdentifier = (
  left: PrereleaseIdentifier,
  right: PrereleaseIdentifier,
): number => {
  if (left === right) {
    return 0;
  }
  if (typeof left === 'number' && typeof right === 'string') {
    return VERSION_LESS_THAN;
  }
  if (typeof left === 'string' && typeof right === 'number') {
    return VERSION_GREATER_THAN;
  }
  return left > right ? VERSION_GREATER_THAN : VERSION_LESS_THAN;
};

const comparePrereleaseParts = (
  left: PrereleaseIdentifier[],
  right: PrereleaseIdentifier[],
): number => {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftPart = left[index] ?? 0;
    const rightPart = right[index] ?? 0;
    const comparison = comparePrereleaseIdentifier(leftPart, rightPart);
    if (comparison !== 0) {
      return comparison;
    }
  }
  if (left.length === right.length) {
    return 0;
  }
  return left.length > right.length ? VERSION_GREATER_THAN : VERSION_LESS_THAN;
};

const comparePrerelease = (left: PrereleaseIdentifier[], right: PrereleaseIdentifier[]): number => {
  if (left.length === 0 && right.length === 0) {
    return 0;
  }
  if (left.length === 0) {
    return VERSION_GREATER_THAN;
  }
  if (right.length === 0) {
    return VERSION_LESS_THAN;
  }

  return comparePrereleaseParts(left, right);
};

const parsePrerelease = (value: string | undefined): PrereleaseIdentifier[] | undefined => {
  if (typeof value !== 'string') {
    return [];
  }
  if (value.toLowerCase().startsWith('rc') && !RELEASE_CANDIDATE_PATTERN.test(value)) {
    return;
  }
  return value
    .split('.')
    .map((identifier) => (/^\d+$/.test(identifier) ? Number(identifier) : identifier));
};

export const parseVersion = (version: string): ParsedVersion | undefined => {
  const trimmed = version.trim();
  const match = STRICT_SEMVER_PATTERN.exec(trimmed);
  if (!match || !match.groups) {
    return;
  }
  const { groups } = match;
  const prerelease = parsePrerelease(groups['prerelease']);
  if (!prerelease) {
    return;
  }
  return {
    numbers: [Number(groups['major']), Number(groups['minor']), Number(groups['patch'])],
    prerelease,
  };
};

export const compareVersions = (left: string, right: string): number | undefined => {
  const normalizedLeft = parseVersion(left);
  const normalizedRight = parseVersion(right);
  if (!normalizedLeft || !normalizedRight) {
    return;
  }

  const numberComparison = compareNumberParts(normalizedLeft, normalizedRight);
  if (numberComparison !== 0) {
    return numberComparison;
  }

  return comparePrerelease(normalizedLeft.prerelease, normalizedRight.prerelease);
};

export const isNewerVersion = (latestVersion: string, currentVersion: string): boolean => {
  const comparison = compareVersions(latestVersion, currentVersion);
  return typeof comparison === 'number' && comparison > 0;
};

export const isPrereleaseVersion = (version: string): boolean | null => {
  const parsed = parseVersion(version);
  if (!parsed) {
    return null;
  }
  return parsed.prerelease.length > 0;
};
