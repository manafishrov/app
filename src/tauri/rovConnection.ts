import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovConfigStore } from '@/stores/rovConfig';
import { setConfig } from '@/tauri/config';
import { setRovConfig } from '@/tauri/rovConfig';

const CONNECTION_APPLY_TIMEOUT_MS = 15_000;
const CONNECTION_POLL_INTERVAL_MS = 50;

export type RovConnectionConfig = {
  ipAddress: string;
  websocketPort: number;
};

const waitForRovDisconnect = (): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    if (!connectionStatusStore.isConnected) {
      resolve();
      return;
    }

    const startedAt = Date.now();
    const interval = globalThis.setInterval(() => {
      if (!connectionStatusStore.isConnected) {
        globalThis.clearInterval(interval);
        resolve();
      } else if (Date.now() - startedAt >= CONNECTION_APPLY_TIMEOUT_MS) {
        globalThis.clearInterval(interval);
        reject(new Error('ROV did not disconnect to apply the new connection settings'));
      }
    }, CONNECTION_POLL_INTERVAL_MS);
  });

const retargetApp = (connection: RovConnectionConfig): Promise<void> =>
  setConfig({
    ipAddress: connection.ipAddress,
    webSocketPort: connection.websocketPort,
  });

export const updateRovConnection = (connection: RovConnectionConfig): Promise<void> => {
  const connectionChanged =
    connection.ipAddress !== rovConfigStore.ipAddress ||
    connection.websocketPort !== rovConfigStore.websocketPort;

  if (!connectionChanged) {
    return retargetApp(connection);
  }

  return setRovConfig(connection)
    .then(waitForRovDisconnect)
    .then(() => retargetApp(connection));
};
