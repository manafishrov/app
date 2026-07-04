type ParsedVersion = {
  numbers: [number, number, number];
  prerelease?: string;
};

const MAJOR_VERSION_INDEX = 0;
const MINOR_VERSION_INDEX = 1;
const PATCH_VERSION_INDEX = 2;
const VERSION_GREATER_THAN = 1;
const VERSION_LESS_THAN = -1;
const VERSION_PARTS = 3;
const VERSION_SPLIT_LIMIT = 2;

const parseNumericParts = (version: string): number[] =>
  version
    .split('.')
    .slice(0, VERSION_PARTS)
    .map((part) => Math.trunc(Number(part)));

const hasInvalidNumericParts = (numericParts: number[]): boolean =>
  numericParts.some((part) => Number.isNaN(part));

const padNumericParts = (numericParts: number[]): void => {
  while (numericParts.length < VERSION_PARTS) {
    numericParts.push(0);
  }
};

const buildVersionNumbers = (numericParts: number[]): [number, number, number] => [
  numericParts[MAJOR_VERSION_INDEX] ?? 0,
  numericParts[MINOR_VERSION_INDEX] ?? 0,
  numericParts[PATCH_VERSION_INDEX] ?? 0,
];

const createParsedVersion = (numericParts: number[], prerelease: string): ParsedVersion => {
  const numbers = buildVersionNumbers(numericParts);
  if (prerelease === '') {
    return { numbers };
  }

  return { numbers, prerelease };
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

const comparePrerelease = (left?: string, right?: string): number => {
  if (left === right) {
    return 0;
  }

  if (typeof left !== 'string') {
    return VERSION_GREATER_THAN;
  }

  if (typeof right !== 'string') {
    return VERSION_LESS_THAN;
  }

  return left.localeCompare(right);
};

const isUnavailableVersion = (version: string): boolean =>
  version === '' || version.toUpperCase() === 'N/A';

const normalizeVersion = (version: string): ParsedVersion | undefined => {
  const trimmed = version.trim();
  if (isUnavailableVersion(trimmed)) {
    return;
  }

  const withoutPrefix = trimmed.replace(/^v/i, '');
  const [coreVersion = '', prerelease = ''] = withoutPrefix.split('-', VERSION_SPLIT_LIMIT);
  const numericParts = parseNumericParts(coreVersion);

  if (hasInvalidNumericParts(numericParts)) {
    return;
  }

  padNumericParts(numericParts);

  return createParsedVersion(numericParts, prerelease);
};

export const compareVersions = (left: string, right: string): number | undefined => {
  const normalizedLeft = normalizeVersion(left);
  const normalizedRight = normalizeVersion(right);
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
