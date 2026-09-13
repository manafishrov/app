import { logError } from '@/lib/log';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';
import { setConfig, stageConfig } from '@/tauri/config';
import { setRovConfig } from '@/tauri/rovConfig';

const CONNECTION_POLL_INTERVAL_MS = 50;
const inFlightUpdates = new Map<string, Promise<void>>();
const resolveVoid: () => void = () => 0;
let connectionUpdateTail: Promise<unknown> = Promise.resolve();
let pendingRetargetGeneration = 0;

export type RovConnectionConfig = {
  ipAddress: string;
  websocketPort: number;
};

const connectionMatches = (actual: RovConnectionConfig, expected: RovConnectionConfig): boolean =>
  actual.ipAddress === expected.ipAddress && actual.websocketPort === expected.websocketPort;

const retargetApp = (connection: RovConnectionConfig): Promise<void> =>
  setConfig({
    ipAddress: connection.ipAddress,
    webSocketPort: connection.websocketPort,
  });

const connectionKey = (connection: RovConnectionConfig): string =>
  `${connection.ipAddress}\0${connection.websocketPort}`;

const retargetAppAfterRestart = (connection: RovConnectionConfig): void => {
  pendingRetargetGeneration += 1;
  const generation = pendingRetargetGeneration;
  const applyTarget = (): void => {
    if (generation !== pendingRetargetGeneration) {
      return;
    }
    retargetApp(connection).catch((error: unknown) => {
      logError('Failed to use the saved ROV connection after restart:', error);
    });
  };
  if (!connectionStatusStore.isConnected) {
    applyTarget();
    return;
  }
  const interval = globalThis.setInterval(() => {
    if (generation !== pendingRetargetGeneration) {
      globalThis.clearInterval(interval);
      return;
    }
    if (!connectionStatusStore.isConnected) {
      globalThis.clearInterval(interval);
      applyTarget();
    }
  }, CONNECTION_POLL_INTERVAL_MS);
};

const performConnectionUpdate = (connection: RovConnectionConfig): Promise<void> => {
  const connectionChanged =
    connection.ipAddress !== rovConfigStore.ipAddress ||
    connection.websocketPort !== rovConfigStore.websocketPort;

  if (connectionChanged) {
    return setRovConfig(connection, {
      beforeConfirm: (confirmedConfig) => {
        if (!connectionMatches(confirmedConfig, connection)) {
          return Promise.reject(new Error('The ROV rejected the requested connection settings'));
        }
        return stageConfig({
          ipAddress: connection.ipAddress,
          webSocketPort: connection.websocketPort,
        });
      },
    }).then(() => {
      if (!connectionMatches(rovConfigStore, connection)) {
        throw new Error('The ROV rejected the requested connection settings');
      }
      retargetAppAfterRestart(connection);
    });
  }

  if (
    connection.ipAddress !== configStore.ipAddress ||
    connection.websocketPort !== configStore.webSocketPort
  ) {
    return retargetApp(connection);
  }
  return Promise.resolve();
};

export const updateRovConnection = (connection: RovConnectionConfig): Promise<void> => {
  const key = connectionKey(connection);
  const existingUpdate = inFlightUpdates.get(key);
  if (existingUpdate) {
    return existingUpdate;
  }

  const update = connectionUpdateTail.then(
    () => performConnectionUpdate(connection),
    () => performConnectionUpdate(connection),
  );
  const trackedUpdate = update.finally(() => {
    if (inFlightUpdates.get(key) === trackedUpdate) {
      inFlightUpdates.delete(key);
    }
  });
  inFlightUpdates.set(key, trackedUpdate);
  connectionUpdateTail = trackedUpdate.catch(resolveVoid);
  return trackedUpdate;
};
