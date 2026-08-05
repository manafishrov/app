import { describe, expect, test } from 'vitest';

import { rovStatusStore, setRovStatusStore, type EscFirmwareVersions } from './rovStatus';

const status = {
  autoStabilization: false,
  depthHold: false,
  batteryPercentage: 75,
  currentDraw: 12,
  piUndervoltage: false,
  health: {
    imuHealthy: true,
    pressureSensorHealthy: true,
    mcuHealthy: true,
  },
};

describe('ROV status device information compatibility', () => {
  test('tracks whether live device information is supported', () => {
    setRovStatusStore(status);
    expect(rovStatusStore.deviceInfoAvailable).toBe(false);
    expect(rovStatusStore.deviceInfo.escFirmwareVersions).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]);

    setRovStatusStore({
      ...status,
      deviceInfo: {
        mcuFirmwareVersion: '1.2.3',
        escFirmwareVersions: [
          '2.20.0',
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ] as EscFirmwareVersions,
      },
    });
    expect(rovStatusStore.deviceInfoAvailable).toBe(true);
    expect(rovStatusStore.deviceInfo.escFirmwareVersions[0]).toBe('2.20.0');
  });
});
