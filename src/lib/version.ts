type ParsedVersion = {
  numbers: [number, number, number];
  prerelease: string | null;
};

const VERSION_PARTS = 3;
const VERSION_SPLIT_LIMIT = 2;

const normalizeVersion = (version: string): ParsedVersion | null => {
  const trimmed = version.trim();
  if (trimmed === '' || trimmed.toUpperCase() === 'N/A') {
    return null;
  }

  const withoutPrefix = trimmed.replace(/^v/i, '');
  const [coreVersion = '', prerelease = ''] = withoutPrefix.split('-', VERSION_SPLIT_LIMIT);
  const numericParts = coreVersion
    .split('.')
    .slice(0, VERSION_PARTS)
    .map((part) => Number.parseInt(part, 10));

  if (numericParts.some((part) => Number.isNaN(part))) {
    return null;
  }

  while (numericParts.length < VERSION_PARTS) {
    numericParts.push(0);
  }

  return {
    numbers: [numericParts[0] ?? 0, numericParts[1] ?? 0, numericParts[2] ?? 0],
    prerelease: prerelease === '' ? null : prerelease,
  };
};

export const compareVersions = (left: string, right: string): number | null => {
  const normalizedLeft = normalizeVersion(left);
  const normalizedRight = normalizeVersion(right);
  if (!normalizedLeft || !normalizedRight) {
    return null;
  }

  for (let index = 0; index < VERSION_PARTS; index += 1) {
    const leftPart = normalizedLeft.numbers[index] ?? 0;
    const rightPart = normalizedRight.numbers[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  if (normalizedLeft.prerelease === normalizedRight.prerelease) {
    return 0;
  }

  if (normalizedLeft.prerelease === null) {
    return 1;
  }

  if (normalizedRight.prerelease === null) {
    return -1;
  }

  return normalizedLeft.prerelease.localeCompare(normalizedRight.prerelease);
};

export const isNewerVersion = (latestVersion: string, currentVersion: string): boolean => {
  const comparison = compareVersions(latestVersion, currentVersion);
  return comparison !== null && comparison > 0;
};
