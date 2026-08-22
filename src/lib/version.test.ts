import { describe, expect, it } from 'vitest';

import {
  compareVersions,
  formatVersionForDisplay,
  isPrereleaseVersion,
  parseVersion,
} from './version';

const VERSION_GREATER_THAN = 1;
const VERSION_LESS_THAN = -1;

describe('version parsing', () => {
  it('hides development build metadata from the displayed version', () => {
    expect(formatVersionForDisplay('1.0.17-rc.7+4.ge6196a8')).toBe('v1.0.17-rc.7');
    expect(formatVersionForDisplay('v1.0.17-rc.7')).toBe('v1.0.17-rc.7');
    expect(formatVersionForDisplay('N/A')).toBe('N/A');
  });

  it.each(['1.2.3-rc1', '1.2.3-rc-1', '1.2.3-RC.1', 'v1.2.3-rc1', '1.2', '1.2.03'])(
    'rejects non-canonical version %s',
    (version) => {
      expect(parseVersion(version)).toBeUndefined();
    },
  );

  it.each(['1.2.3', 'v1.2.3', '1.2.3-rc.1', '1.2.3-beta.2', '1.2.3+build.4'])(
    'accepts strict SemVer %s',
    (version) => {
      expect(parseVersion(version)).toBeDefined();
    },
  );

  it('orders numeric prerelease identifiers numerically', () => {
    expect(compareVersions('1.2.3-rc.10', '1.2.3-rc.9')).toBe(VERSION_GREATER_THAN);
    expect(compareVersions('1.2.3-rc.1', '1.2.3')).toBe(VERSION_LESS_THAN);
  });

  it('identifies prereleases from their version instead of release metadata', () => {
    expect(isPrereleaseVersion('1.2.3-rc.1')).toBe(true);
    expect(isPrereleaseVersion('1.2.3')).toBe(false);
    expect(isPrereleaseVersion('1.2.3-rc1')).toBeNull();
    expect(isPrereleaseVersion('N/A')).toBeNull();
  });
});
