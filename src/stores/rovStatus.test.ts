import { describe, expect, test } from 'vitest';

import {
  isEscFirmwareUpdatePending,
  rovStatusStore,
  setRovStatusStore,
  type EscFirmwareVersions,
} from './rovStatus';

const status = {
  autoStabilization: false,
  depthHold: false,
  batteryPercentage: 75,
  currentDraw: 12,
  piUndervoltage: false,
  thrusterControlReady: true,
  health: {
    imuHealthy: true,
    pressureSensorHealthy: true,
    mcuHealthy: true,
  },
  deviceInfo: {
    mcuFirmwareVersion: '1.2.3-rc.1',
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
  escFirmwareUpdate: {
    active: false,
    stage: 'idle' as const,
    progress: 0,
    currentEsc: null,
    targetVersion: null,
    error: null,
    recoveryRequired: false,
  },
};

describe('ROV status device information', () => {
  test('keeps firmware controls locked during live version confirmation', () => {
    expect(
      isEscFirmwareUpdatePending({
        active: false,
        recoveryRequired: false,
        stage: 'awaitingTelemetry',
      }),
    ).toBe(true);
  });

  test('stores the required live device information', () => {
    setRovStatusStore(status);
    expect(rovStatusStore.deviceInfo.mcuFirmwareVersion).toBe('1.2.3-rc.1');
    expect(rovStatusStore.thrusterControlReady).toBe(true);
    expect(rovStatusStore.deviceInfo.escFirmwareVersions[0]).toBe('2.20.0');

    setRovStatusStore({
      ...status,
      deviceInfo: {
        mcuFirmwareVersion: '1.2.4-rc.1',
        escFirmwareVersions: [
          '2.21.0-rc.2',
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
    expect(rovStatusStore.deviceInfo.mcuFirmwareVersion).toBe('1.2.4-rc.1');
    expect(rovStatusStore.deviceInfo.escFirmwareVersions[0]).toBe('2.21.0-rc.2');
  });
});
