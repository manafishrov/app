import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as RovConfigModule from '@/stores/rovConfig';

import { defaultRovConfig, type RovConfig } from '@/stores/rovConfig';

/* oxlint-disable no-magic-numbers -- Complete protocol fixture values are clearer inline. */

type ConfigResponse = { mutationId?: string; error?: string; config: RovConfig };

const mocks = vi.hoisted(() => ({
  connectionStatus: { isConnected: true },
  createListener: vi.fn(),
  invokeCommand: vi.fn(),
  listeners: [] as ((response: ConfigResponse) => void)[],
  mutationIds: [] as string[],
  setRovConfigStore: vi.fn(),
}));

vi.mock('@/stores/connectionStatus', () => ({
  connectionStatusStore: mocks.connectionStatus,
}));
vi.mock('@/stores/rovConfig', (importOriginal) =>
  importOriginal<typeof RovConfigModule>().then((original) => ({
    ...original,
    setRovConfigStore: mocks.setRovConfigStore,
  })),
);
vi.mock('@/tauri/core', () => ({
  createListener: mocks.createListener,
  invokeCommand: mocks.invokeCommand,
}));

import { importRovConfig, setRovConfig, setupRovConfigListener } from '@/tauri/rovConfig';

const confirmedConfig: RovConfig = { ...defaultRovConfig, rovName: 'Confirmed ROV' };
const LAST_ITEM_OFFSET = 1;
const THIRD_CALL = 3;
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
    (_event: string, listener: (response: ConfigResponse) => void): Promise<() => void> => {
      mocks.listeners.push(listener);
      return Promise.resolve(resolveVoid);
    },
  );
  return setupRovConfigListener();
});

afterEach(() => {
  vi.useRealTimers();
});

const latestMutationId = (): string => {
  const mutationId = mocks.mutationIds[mocks.mutationIds.length - LAST_ITEM_OFFSET];
  if (typeof mutationId !== 'string' || mutationId === '') {
    throw new TypeError('Config mutation did not include an identifier');
  }
  return mutationId;
};

const confirmLatestConfig = (mutationId = latestMutationId(), error?: string): void => {
  const listener = mocks.listeners[mocks.listeners.length - LAST_ITEM_OFFSET];
  if (!listener) {
    throw new Error('ROV config listener was not installed');
  }
  listener({
    mutationId,
    config: confirmedConfig,
    ...(typeof error === 'string' ? { error } : {}),
  });
};

describe('Pico-owned settings confirmation contract', () => {
  const settings: Partial<RovConfig>[] = [
    { regulator: confirmedConfig.regulator },
    { directionCoefficients: confirmedConfig.directionCoefficients },
    { power: confirmedConfig.power },
    { thrusterPinSetup: confirmedConfig.thrusterPinSetup },
    { thrusterAllocation: confirmedConfig.thrusterAllocation },
    { nullspaceVectors: confirmedConfig.nullspaceVectors },
    { thrusterProtocol: 'dshot', dshotSpeed: 600 },
  ];

  it.each(settings)('forwards %j without optimistic confirmation', (payload) => {
    const update = setRovConfig(payload);
    return Promise.resolve().then(() => {
      const mutationId = latestMutationId();
      expect(mocks.invokeCommand).toHaveBeenCalledExactlyOnceWith('set_rov_config', {
        payload,
        mutationId,
      });
      expect(mocks.setRovConfigStore).not.toHaveBeenCalled();
      confirmLatestConfig(mutationId);
      return update.then(() => {
        expect(mocks.invokeCommand).toHaveBeenLastCalledWith('confirm_rov_config', { mutationId });
      });
    });
  });
});

const checkStaleResponse = (expiredId: string): Promise<void> => {
  const second = setRovConfig({ power: confirmedConfig.power });
  return Promise.resolve().then(() => {
    const activeId = latestMutationId();
    expect(activeId).not.toBe(expiredId);
    confirmLatestConfig(expiredId);
    confirmLatestConfig(expiredId, 'late rejection');
    return Promise.resolve().then(() => {
      expect(mocks.invokeCommand).toHaveBeenCalledTimes(2);
      confirmLatestConfig(activeId);
      return second.then(() => {
        expect(mocks.invokeCommand).toHaveBeenLastCalledWith('confirm_rov_config', {
          mutationId: activeId,
        });
      });
    });
  });
};

describe('Pico config timeout and response ordering', () => {
  it('allows the full Pico apply budget before confirming', () => {
    vi.useFakeTimers();
    const update = setRovConfig({ regulator: confirmedConfig.regulator });
    return vi.advanceTimersByTimeAsync(8000).then(() => {
      expect(mocks.invokeCommand).toHaveBeenCalledTimes(1);
      confirmLatestConfig();
      return update;
    });
  });

  it('times out a lost ACK and ignores a stale response during the next mutation', () => {
    vi.useFakeTimers();
    const first = setRovConfig({ regulator: confirmedConfig.regulator });
    const rejected = expect(first).rejects.toThrow('Timed out waiting for the ROV');
    let expiredId = '';
    return Promise.resolve()
      .then(() => {
        expiredId = latestMutationId();
        return vi.advanceTimersByTimeAsync(12_000);
      })
      .then(() => rejected)
      .then(() => {
        expect(mocks.invokeCommand).toHaveBeenCalledTimes(1);
        return checkStaleResponse(expiredId);
      });
  });
});

describe('Pico config rejection and duplicate responses', () => {
  it.each(['Pico rejected apply', 'Pico apply ACK timed out', ''])(
    'rejects %j without authorizing success',
    (error) => {
      const beforeConfirm = vi.fn(() => Promise.resolve());
      const update = setRovConfig({ regulator: confirmedConfig.regulator }, { beforeConfirm });
      const rejected = expect(update).rejects.toThrow(error);
      return Promise.resolve()
        .then(() => {
          confirmLatestConfig(latestMutationId(), error);
          return rejected;
        })
        .then(() => {
          expect(mocks.setRovConfigStore).toHaveBeenCalledWith(confirmedConfig);
          expect(beforeConfirm).not.toHaveBeenCalled();
          expect(mocks.invokeCommand).toHaveBeenCalledTimes(1);
        });
    },
  );

  it('confirms a duplicate applied response only once', () => {
    const update = setRovConfig({ regulator: confirmedConfig.regulator });
    return Promise.resolve()
      .then(() => {
        const mutationId = latestMutationId();
        confirmLatestConfig(mutationId);
        confirmLatestConfig(mutationId);
        return update;
      })
      .then(() => {
        expect(mocks.invokeCommand).toHaveBeenCalledTimes(2);
      });
  });
});

describe('ROV config mutations', () => {
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
        expect(mocks.invokeCommand).toHaveBeenNthCalledWith(THIRD_CALL, 'import_rov_config', {
          payload: { rovName: 'Second' },
          mutationId: secondMutationId,
        });
        confirmLatestConfig(secondMutationId);
        return second;
      });
  });
});

describe('when a ROV config mutation fails or receives another response', () => {
  it('rejects when final confirmation cannot be sent', () => {
    const update = setRovConfig({ regulator: confirmedConfig.regulator });
    const rejected = expect(update).rejects.toThrow('confirmation send failed');
    return Promise.resolve().then(() => {
      mocks.invokeCommand.mockRejectedValueOnce(new Error('confirmation send failed'));
      confirmLatestConfig();
      return rejected;
    });
  });

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
