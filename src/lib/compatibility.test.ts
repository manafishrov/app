import { describe, expect, it, vi } from 'vitest';

import {
  compatibilityKey,
  compatibleApps,
  isVerifiedPair,
  leavesLegacyApp,
  leavesLegacyFirmware,
} from './compatibility';

vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

describe('compatibility', () => {
  it('matches verified pairs regardless of tag prefix and build metadata', () => {
    expect(isVerifiedPair('1.0.18+4.gabc1234', 'v1.1.6')).toBe(true);
    expect(isVerifiedPair('1.0.18', '1.2.0')).toBe(false);
    expect(isVerifiedPair('1.1.0-rc.3', '1.2.0-rc.3')).toBe(false);
    expect(compatibilityKey('1.0.18+4.gabc1234', 'v1.1.6')).toBe('1.0.18@1.1.6');
  });

  it('keeps the protocol boundaries between old releases', () => {
    expect(isVerifiedPair('1.0.16', 'v1.1.4')).toBe(true);
    expect(isVerifiedPair('1.0.16', 'v1.1.6')).toBe(false);
    expect(isVerifiedPair('1.0.11', 'v1.0.27')).toBe(true);
    expect(isVerifiedPair('1.0.12', 'v1.0.27')).toBe(false);
  });

  it('lists the apps verified with a firmware release', () => {
    expect(compatibleApps('v1.1.6')).toContain('1.0.18');
    expect(compatibleApps('v1.2.0')).toEqual([]);
  });

  it('flags app updates that leave the legacy release', () => {
    expect(leavesLegacyApp('1.0.17', '1.1.0')).toBe(true);
    expect(leavesLegacyApp('1.0.17', '1.0.18')).toBe(false);
    expect(leavesLegacyApp('1.1.0', '1.1.1')).toBe(false);
    expect(leavesLegacyApp('N/A', '1.1.0')).toBe(false);
  });

  it('flags firmware flashes that leave the legacy release', () => {
    expect(leavesLegacyFirmware('1.0.18', 'N/A', 'v1.2.0')).toBe(true);
    expect(leavesLegacyFirmware('1.1.0', '1.1.6', 'v1.2.0')).toBe(true);
    expect(leavesLegacyFirmware('1.1.0', '1.2.0', 'v1.2.1')).toBe(false);
    expect(leavesLegacyFirmware('1.0.18', 'N/A', 'v1.1.6')).toBe(false);
  });
});
