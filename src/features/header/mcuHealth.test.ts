import { describe, expect, it } from 'vitest';

import { getMcuHealth } from './mcuHealth';

type Status = Parameters<typeof getMcuHealth>[0];

const readyStatus = (): Status => ({
  health: { mcuHealthy: true, imuHealthy: true, pressureSensorHealthy: false },
  thrusterControlReady: true,
  thrusterProtocolState: 'ready',
  deviceInfo: {
    mcuFirmwareVersion: '1.0.3-rc.6',
    mcuFirmwareVersionStatus: 'reported',
    escFirmwareVersions: [null, null, null, null, null, null, null, null],
    escFirmwareVersionStatus: 'notReported',
  },
});

describe('MCU health', () => {
  it('is ready without any ESCs once USB, protocol and identity are ready', () => {
    expect(getMcuHealth(readyStatus())).toBe('ready');
  });

  it('does not show a failed protocol as healthy just because USB is connected', () => {
    const status = readyStatus();
    status.thrusterControlReady = false;
    status.thrusterProtocolState = 'failed';
    expect(getMcuHealth(status)).toBe('protocolFailed');
  });

  it.each(['synchronizing', 'applying'] as const)('shows %s as initializing', (state) => {
    const status = readyStatus();
    status.thrusterProtocolState = state;
    status.thrusterControlReady = false;
    expect(getMcuHealth(status)).toBe('initializing');
  });

  it('does not show ready while control is blocked', () => {
    const status = readyStatus();
    status.thrusterControlReady = false;
    expect(getMcuHealth(status)).toBe('initializing');
  });

  it.each(['querying', 'notReported'] as const)(
    'shows identity status %s as incomplete',
    (state) => {
      const status = readyStatus();
      status.deviceInfo.mcuFirmwareVersionStatus = state;
      expect(getMcuHealth(status)).toBe('identityMissing');
    },
  );

  it('requires a nonempty reported identity', () => {
    const status = readyStatus();
    status.deviceInfo.mcuFirmwareVersion = '';
    expect(getMcuHealth(status)).toBe('identityMissing');
  });

  it('does not preserve green health after USB disconnects', () => {
    const status = readyStatus();
    status.health.mcuHealthy = false;
    expect(getMcuHealth(status)).toBe('disconnected');
  });
});
