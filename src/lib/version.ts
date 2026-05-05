type ParsedVersion = {
  numbers: [number, number, number];
  prerelease?: string;
};

const VERSION_PARTS = 3;
const VERSION_SPLIT_LIMIT = 2;
const PATCH_INDEX = 2;
const VERSION_GREATER = 1;
const VERSION_LESS = -1;

const isUnavailableVersion = (version: string): boolean =>
  version === '' || version.toUpperCase() === 'N/A';

const parseCoreParts = (coreVersion: string): number[] =>
  coreVersion
    .split('.')
    .slice(0, VERSION_PARTS)
    .map((part) => Number.parseInt(part, 10));

const padVersionParts = (parts: number[]): [number, number, number] => {
  const paddedParts = [...parts];
  while (paddedParts.length < VERSION_PARTS) {
    paddedParts.push(0);
  }
  return [paddedParts[0] ?? 0, paddedParts[1] ?? 0, paddedParts[PATCH_INDEX] ?? 0];
};

const normalizeVersion = (version: string): ParsedVersion | undefined => {
  const trimmed = version.trim();
  if (isUnavailableVersion(trimmed)) {
    return;
  }

  const withoutPrefix = trimmed.replace(/^v/i, '');
  const [coreVersion = '', prerelease = ''] = withoutPrefix.split('-', VERSION_SPLIT_LIMIT);
  const numericParts = parseCoreParts(coreVersion);

  if (numericParts.some((part) => Number.isNaN(part))) {
    return;
  }

  return {
    numbers: padVersionParts(numericParts),
    ...(prerelease === '' ? {} : { prerelease }),
  };
};

const compareVersionNumbers = (left: ParsedVersion, right: ParsedVersion): number => {
  for (let index = 0; index < VERSION_PARTS; index += 1) {
    const leftPart = left.numbers[index] ?? 0;
    const rightPart = right.numbers[index] ?? 0;
    if (leftPart !== rightPart) {
      return leftPart > rightPart ? VERSION_GREATER : VERSION_LESS;
    }
  }
  return 0;
};

const comparePrerelease = (left: ParsedVersion, right: ParsedVersion): number => {
  if (left.prerelease === right.prerelease) {
    return 0;
  }
  if (typeof left.prerelease !== 'string') {
    return VERSION_GREATER;
  }
  if (typeof right.prerelease !== 'string') {
    return VERSION_LESS;
  }
  return left.prerelease.localeCompare(right.prerelease);
};

export const compareVersions = (left: string, right: string): number | undefined => {
  const normalizedLeft = normalizeVersion(left);
  const normalizedRight = normalizeVersion(right);
  if (!normalizedLeft || !normalizedRight) {
    return;
  }

  const numberComparison = compareVersionNumbers(normalizedLeft, normalizedRight);
  if (numberComparison !== 0) {
    return numberComparison;
  }
  return comparePrerelease(normalizedLeft, normalizedRight);
};

export const isNewerVersion = (latestVersion: string, currentVersion: string): boolean => {
  const comparison = compareVersions(latestVersion, currentVersion);
  return typeof comparison === 'number' && comparison > 0;
};
