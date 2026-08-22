import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const POLL_INTERVAL_MS = 50;
const APPLY_TIMEOUT_MS = 15_000;
const RECONNECT_TIMEOUT_MS = 20_000;
const changedConnection = { ipAddress: '10.10.11.10', websocketPort: 9100 };

const mocks = vi.hoisted(() => ({
  connectionStatus: { isConnected: true },
  config: { ipAddress: '10.10.10.10', webSocketPort: 9000 },
  rovConfig: { ipAddress: '10.10.10.10', websocketPort: 9000 },
  setConfig: vi.fn(),
  setRovConfig: vi.fn(),
}));

vi.mock('@/stores/connectionStatus', () => ({ connectionStatusStore: mocks.connectionStatus }));
vi.mock('@/stores/config', () => ({ configStore: mocks.config }));
vi.mock('@/stores/rovConfig', () => ({ rovConfigStore: mocks.rovConfig }));
vi.mock('@/tauri/config', () => ({ setConfig: mocks.setConfig }));
vi.mock('@/tauri/rovConfig', () => ({ setRovConfig: mocks.setRovConfig }));

import { updateRovConnection } from '@/tauri/rovConnection';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.connectionStatus.isConnected = true;
  mocks.rovConfig.ipAddress = '10.10.10.10';
  mocks.rovConfig.websocketPort = 9000;
  mocks.config.ipAddress = '10.10.10.10';
  mocks.config.webSocketPort = 9000;
  mocks.setRovConfig.mockImplementation((connection: typeof changedConnection): Promise<void> => {
    mocks.rovConfig.ipAddress = connection.ipAddress;
    mocks.rovConfig.websocketPort = connection.websocketPort;
    return Promise.resolve();
  });
  mocks.setConfig.mockImplementation((): Promise<void> => Promise.resolve());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('when ROV connection settings change', () => {
  test('retargets the app only after the ROV disconnects', () => {
    const calls: string[] = [];
    mocks.setRovConfig.mockImplementation((connection: typeof changedConnection): Promise<void> => {
      calls.push('rov');
      mocks.rovConfig.ipAddress = connection.ipAddress;
      mocks.rovConfig.websocketPort = connection.websocketPort;
      return Promise.resolve();
    });
    mocks.setConfig.mockImplementation((): Promise<void> => {
      calls.push('app');
      return Promise.resolve();
    });

    const update = updateRovConnection(changedConnection);
    return Promise.resolve()
      .then(() => {
        expect(calls).toEqual(['rov']);
        mocks.connectionStatus.isConnected = false;
        return vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      })
      .then(() => {
        expect(calls).toEqual(['rov', 'app']);
        mocks.connectionStatus.isConnected = true;
        return vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      })
      .then(() => update)
      .then(() => {
        expect(calls).toEqual(['rov', 'app']);
        expect(mocks.setRovConfig).toHaveBeenCalledWith(changedConnection);
        expect(mocks.setConfig).toHaveBeenCalledWith({
          ipAddress: changedConnection.ipAddress,
          webSocketPort: changedConnection.websocketPort,
        });
      });
  });

  test('keeps the app on its current address when sending fails', () => {
    mocks.setRovConfig.mockRejectedValue(new Error('send failed'));

    return expect(updateRovConnection(changedConnection))
      .rejects.toThrow('send failed')
      .then(() => {
        expect(mocks.setConfig).not.toHaveBeenCalled();
      });
  });
});

describe('when a connection update is already in flight', () => {
  test('shares the update for identical connection settings', () => {
    const firstUpdate = updateRovConnection(changedConnection);
    const secondUpdate = updateRovConnection(changedConnection);

    expect(secondUpdate).toBe(firstUpdate);
    expect(mocks.setRovConfig).toHaveBeenCalledTimes(1);

    mocks.connectionStatus.isConnected = false;
    return vi
      .advanceTimersByTimeAsync(POLL_INTERVAL_MS)
      .then(() => {
        mocks.connectionStatus.isConnected = true;
        return vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      })
      .then(() => Promise.all([firstUpdate, secondUpdate]))
      .then(() => {
        expect(mocks.setConfig).toHaveBeenCalledTimes(1);
      });
  });
});

describe('when applying or reconciling connection settings', () => {
  test('keeps the app on its current address when the ROV stays connected', () => {
    const rejection = expect(updateRovConnection(changedConnection)).rejects.toThrow(
      'ROV did not disconnect',
    );

    return vi
      .advanceTimersByTimeAsync(APPLY_TIMEOUT_MS)
      .then(() => rejection)
      .then(() => {
        expect(mocks.setConfig).not.toHaveBeenCalled();
      });
  });

  test('repairs app-only settings without waiting for a ROV restart', () => {
    mocks.rovConfig.ipAddress = changedConnection.ipAddress;
    mocks.rovConfig.websocketPort = changedConnection.websocketPort;

    return updateRovConnection(changedConnection).then(() => {
      expect(mocks.setRovConfig).not.toHaveBeenCalled();
      expect(mocks.setConfig).toHaveBeenCalledWith({
        ipAddress: changedConnection.ipAddress,
        webSocketPort: changedConnection.websocketPort,
      });
    });
  });

  test('restores the previous app endpoint when the new address never reconnects', () => {
    const update = updateRovConnection(changedConnection);
    const rejection = expect(update).rejects.toThrow('did not reconnect');
    mocks.connectionStatus.isConnected = false;

    return vi
      .advanceTimersByTimeAsync(POLL_INTERVAL_MS)
      .then(() => vi.advanceTimersByTimeAsync(RECONNECT_TIMEOUT_MS))
      .then(() => rejection)
      .then(() => {
        expect(mocks.setConfig).toHaveBeenLastCalledWith({
          ipAddress: '10.10.10.10',
          webSocketPort: 9000,
        });
      });
  });
});
