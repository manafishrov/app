import { createSignal } from 'solid-js';

import bundledCompatibility from '@/compatibility.json';
import { logError } from '@/lib/log';
import { compareVersions, isNewerVersion } from '@/lib/version';

// Stable app releases mapped to the stable firmware releases they were verified with.
// Older apps fetch this file from main to learn about newer releases.
const COMPATIBILITY_URL =
  'https://raw.githubusercontent.com/manafishrov/app/main/src/compatibility.json';

// The last releases for ROVs with the IMU on the white JST connector (I2C).
// Newer releases read the IMU over SPI, which requires soldering it to the Pico.
export const LEGACY_APP_VERSION = '1.0.18';
export const LEGACY_FIRMWARE_VERSION = '1.1.6';

type Compatibility = Record<string, string[]>;

const [compatibility, setCompatibility] = createSignal<Compatibility>(bundledCompatibility);

const isCompatibility = (value: unknown): value is Compatibility =>
  typeof value === 'object' &&
  value !== null &&
  Object.values(value).every(
    (versions) =>
      Array.isArray(versions) && versions.every((version) => typeof version === 'string'),
  );

export const releaseVersion = (version: string): string =>
  version.trim().replace(/^v/, '').split('+', 1)[0] ?? '';

const isAtMost = (version: string, limit: string): boolean => {
  const comparison = compareVersions(version, limit);
  return typeof comparison === 'number' && comparison <= 0;
};

export const loadCompatibility = (): Promise<void> =>
  fetch(COMPATIBILITY_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Compatibility file returned status ${response.status}`);
      }
      return response.json();
    })
    .then((remote: unknown) => {
      if (!isCompatibility(remote)) {
        throw new Error('Compatibility file has an unexpected shape');
      }
      setCompatibility({ ...bundledCompatibility, ...remote });
    })
    .catch((error: unknown) => {
      logError('Failed to load app and firmware compatibility:', error);
    });

export const compatibleFirmware = (appVersion: string): string[] =>
  compatibility()[releaseVersion(appVersion)] ?? [];

export const compatibleApps = (firmwareVersion: string): string[] => {
  const firmware = releaseVersion(firmwareVersion);
  return Object.entries(compatibility())
    .filter(([, firmwareVersions]) => firmwareVersions.includes(firmware))
    .map(([appVersion]) => appVersion);
};

export const isVerifiedPair = (appVersion: string, firmwareVersion: string): boolean =>
  compatibleFirmware(appVersion).includes(releaseVersion(firmwareVersion));

export const compatibilityKey = (appVersion: string, firmwareVersion: string): string =>
  `${releaseVersion(appVersion)}@${releaseVersion(firmwareVersion)}`;

export const isLegacyApp = (version: string): boolean => isAtMost(version, LEGACY_APP_VERSION);

export const isLegacyFirmware = (version: string): boolean =>
  isAtMost(version, LEGACY_FIRMWARE_VERSION);

export const leavesLegacyApp = (currentVersion: string, targetVersion: string): boolean =>
  isLegacyApp(currentVersion) && isNewerVersion(targetVersion, LEGACY_APP_VERSION);

export const leavesLegacyFirmware = (
  appVersion: string,
  installedFirmwareVersion: string,
  targetFirmwareVersion: string,
): boolean =>
  (isLegacyApp(appVersion) || isLegacyFirmware(installedFirmwareVersion)) &&
  isNewerVersion(targetFirmwareVersion, LEGACY_FIRMWARE_VERSION);
