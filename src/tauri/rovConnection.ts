import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';
import { setConfig } from '@/tauri/config';
import { setRovConfig } from '@/tauri/rovConfig';

const CONNECTION_APPLY_TIMEOUT_MS = 15_000;
const CONNECTION_RECONNECT_TIMEOUT_MS = 20_000;
const CONNECTION_POLL_INTERVAL_MS = 50;
const inFlightUpdates = new Map<string, Promise<void>>();

export type RovConnectionConfig = {
  ipAddress: string;
  websocketPort: number;
};

const connectionMatches = (actual: RovConnectionConfig, expected: RovConnectionConfig): boolean =>
  actual.ipAddress === expected.ipAddress && actual.websocketPort === expected.websocketPort;

const waitForRovDisconnect = (expected: RovConnectionConfig): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (!connectionStatusStore.isConnected) {
      resolve();
      return;
    }

    const startedAt = Date.now();
    const interval = globalThis.setInterval(() => {
      if (!connectionMatches(rovConfigStore, expected)) {
        globalThis.clearInterval(interval);
        reject(new Error('The ROV could not apply the requested connection settings'));
      } else if (!connectionStatusStore.isConnected) {
        globalThis.clearInterval(interval);
        resolve();
      } else if (Date.now() - startedAt >= CONNECTION_APPLY_TIMEOUT_MS) {
        globalThis.clearInterval(interval);
        reject(new Error('ROV did not disconnect to apply the new connection settings'));
      }
    }, CONNECTION_POLL_INTERVAL_MS);
  });

const waitForRovReconnect = (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const startedAt = Date.now();
    const interval = globalThis.setInterval(() => {
      if (connectionStatusStore.isConnected) {
        globalThis.clearInterval(interval);
        resolve();
      } else if (Date.now() - startedAt >= CONNECTION_RECONNECT_TIMEOUT_MS) {
        globalThis.clearInterval(interval);
        reject(new Error('The ROV did not reconnect at the new address'));
      }
    }, CONNECTION_POLL_INTERVAL_MS);
  });

const retargetApp = (connection: RovConnectionConfig): Promise<void> =>
  setConfig({
    ipAddress: connection.ipAddress,
    webSocketPort: connection.websocketPort,
  });

const retargetAppWithFallback = (
  connection: RovConnectionConfig,
  previousConnection: RovConnectionConfig,
): Promise<void> =>
  retargetApp(connection)
    .then(waitForRovReconnect)
    .catch((error: unknown) =>
      retargetApp(previousConnection).then(() => {
        throw error;
      }),
    );

const connectionKey = (connection: RovConnectionConfig): string =>
  `${connection.ipAddress}\0${connection.websocketPort}`;

export const updateRovConnection = (connection: RovConnectionConfig): Promise<void> => {
  const key = connectionKey(connection);
  const existingUpdate = inFlightUpdates.get(key);
  if (existingUpdate) {
    return existingUpdate;
  }

  const connectionChanged =
    connection.ipAddress !== rovConfigStore.ipAddress ||
    connection.websocketPort !== rovConfigStore.websocketPort;

  const previousAppConnection = {
    ipAddress: configStore.ipAddress,
    websocketPort: configStore.webSocketPort,
  };
  const update = connectionChanged
    ? setRovConfig(connection)
        .then(() => {
          if (!connectionMatches(rovConfigStore, connection)) {
            throw new Error('The ROV rejected the requested connection settings');
          }
          return waitForRovDisconnect(connection);
        })
        .then(() => retargetAppWithFallback(connection, previousAppConnection))
    : retargetApp(connection);
  const trackedUpdate = update.finally(() => {
    if (inFlightUpdates.get(key) === trackedUpdate) {
      inFlightUpdates.delete(key);
    }
  });
  inFlightUpdates.set(key, trackedUpdate);
  return trackedUpdate;
};
