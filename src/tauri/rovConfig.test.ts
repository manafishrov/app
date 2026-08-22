import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RovConfig } from '@/stores/rovConfig';

/* oxlint-disable no-magic-numbers -- Complete protocol fixture values are clearer inline. */

const mocks = vi.hoisted(() => ({
  connectionStatus: { isConnected: true },
  createListener: vi.fn(),
  invokeCommand: vi.fn(),
  listeners: [] as ((response: { mutationId?: string; config: RovConfig }) => void)[],
  mutationIds: [] as string[],
  setRovConfigStore: vi.fn(),
}));

vi.mock('@/stores/connectionStatus', () => ({
  connectionStatusStore: mocks.connectionStatus,
}));
vi.mock('@/stores/rovConfig', () => ({
  setRovConfigStore: mocks.setRovConfigStore,
}));
vi.mock('@/tauri/core', () => ({
  createListener: mocks.createListener,
  invokeCommand: mocks.invokeCommand,
}));

import { importRovConfig, setRovConfig, setupRovConfigListener } from '@/tauri/rovConfig';

const zeroRow = [0, 0, 0, 0, 0, 0, 0, 0] as const;
const confirmedConfig: RovConfig = {
  firmwareVersion: '1.1.6-rc.5',
  rovName: 'Confirmed ROV',
  mcuBoard: 'pico',
  thrusterProtocol: 'dshot',
  dshotSpeed: 300,
  currentSensingMode: 'sharedBus',
  fluidType: 'saltwater',
  smoothingFactor: 0,
  thrusterPinSetup: {
    identifiers: [0, 1, 2, 3, 4, 5, 6, 7],
    spinDirections: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  thrusterAllocation: [
    [...zeroRow],
    [...zeroRow],
    [...zeroRow],
    [...zeroRow],
    [...zeroRow],
    [...zeroRow],
    [...zeroRow],
    [...zeroRow],
  ],
  nullspaceVectors: [],
  regulator: {
    pitch: { kp: 0, ki: 0, kd: 0, rate: 0 },
    roll: { kp: 0, ki: 0, kd: 0, rate: 0 },
    yaw: { kp: 0, ki: 0, kd: 0, rate: 0 },
    depth: { kp: 0, ki: 0, kd: 0, rate: 0 },
    fpvMode: false,
  },
  directionCoefficients: { surge: 1, sway: 1, heave: 1 },
  power: {
    thrustersLimit: 30,
    actionsLimit: 50,
    regulatorLimit: 30,
    minBatteryVoltage: 16,
    maxBatteryVoltage: 20.5,
  },
  camera: {
    width: 1440,
    height: 1080,
    framerate: 30,
    cropFov: false,
    bitrate: 9_331_200,
    keyframeInterval: 30,
    profile: 'baseline',
    level: '4.2',
    rotation: 0,
    hflip: false,
    vflip: false,
    awb: 'auto',
    exposureValue: 0,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    sharpness: 1,
    denoise: 'off',
  },
  ipAddress: '10.10.10.10',
  websocketPort: 9000,
};
const LAST_ITEM_OFFSET = 1;
const SECOND_CALL = 2;
const resolveVoid: () => void = () => 0;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listeners.length = 0;
  mocks.mutationIds.length = 0;
  mocks.invokeCommand.mockImplementation(
    (_command: string, args?: { mutationId?: unknown }): Promise<null> => {
      if (typeof args === 'object' && typeof args.mutationId === 'string') {
        mocks.mutationIds.push(args.mutationId);
      }
      return Promise.resolve(null);
    },
  );
  mocks.createListener.mockImplementation(
    (
      _event: string,
      listener: (response: { mutationId?: string; config: RovConfig }) => void,
    ): Promise<() => void> => {
      mocks.listeners.push(listener);
      return Promise.resolve(resolveVoid);
    },
  );
  return setupRovConfigListener();
});

const latestMutationId = (): string => {
  const mutationId = mocks.mutationIds[mocks.mutationIds.length - LAST_ITEM_OFFSET];
  if (typeof mutationId !== 'string' || mutationId === '') {
    throw new TypeError('Config mutation did not include an identifier');
  }
  return mutationId;
};

const confirmLatestConfig = (mutationId = latestMutationId()): void => {
  const listener = mocks.listeners[mocks.listeners.length - LAST_ITEM_OFFSET];
  if (!listener) {
    throw new Error('ROV config listener was not installed');
  }
  listener({ mutationId, config: confirmedConfig });
};

describe('ROV config mutations', () => {
  it('waits for the canonical config response before resolving', () => {
    let resolved = false;
    const update = setRovConfig({ rovName: 'Requested ROV' }).then(() => {
      resolved = true;
    });

    return Promise.resolve()
      .then(() => {
        const mutationId = latestMutationId();
        expect(mocks.invokeCommand).toHaveBeenCalledWith('set_rov_config', {
          payload: { rovName: 'Requested ROV' },
          mutationId,
        });
        expect(resolved).toBe(false);
        confirmLatestConfig();
        return update;
      })
      .then(() => {
        expect(resolved).toBe(true);
        expect(mocks.setRovConfigStore).toHaveBeenCalledWith(confirmedConfig);
      });
  });

  it('serializes mutations so responses cannot confirm the wrong request', () => {
    const first = setRovConfig({ rovName: 'First' });
    const second = importRovConfig({ rovName: 'Second' });

    return Promise.resolve()
      .then(() => {
        expect(mocks.invokeCommand).toHaveBeenCalledTimes(1);
        const firstMutationId = latestMutationId();
        confirmLatestConfig(firstMutationId);
        return first;
      })
      .then(resolveVoid)
      .then(() => {
        const secondMutationId = latestMutationId();
        expect(mocks.invokeCommand).toHaveBeenNthCalledWith(SECOND_CALL, 'import_rov_config', {
          payload: { rovName: 'Second' },
          mutationId: secondMutationId,
        });
        confirmLatestConfig(secondMutationId);
        return second;
      });
  });
});

describe('when a ROV config mutation fails or receives another response', () => {
  it('rejects immediately when the command cannot be sent', () => {
    mocks.invokeCommand.mockRejectedValueOnce(new Error('send failed'));

    return expect(setRovConfig({ rovName: 'Requested ROV' })).rejects.toThrow('send failed');
  });

  it('does not resolve a mutation from an unrelated config response', () => {
    let resolved = false;
    const update = setRovConfig({ rovName: 'Requested ROV' }).then(() => {
      resolved = true;
    });

    return Promise.resolve()
      .then(() => {
        confirmLatestConfig('unrelated-mutation');
        expect(resolved).toBe(false);
        confirmLatestConfig();
        return update;
      })
      .then(() => {
        expect(resolved).toBe(true);
      });
  });
});
