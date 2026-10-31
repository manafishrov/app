import { logWarn } from '@/lib/log';
import {
  connectionStatusStore,
  setConnectionStatusStore,
  type ConnectionStatus,
} from '@/stores/connectionStatus';
import { disconnectCapabilities, refreshCapabilities } from '@/tauri/capabilities';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_connection_status_updated';

export const setupConnectionListener = (): Promise<() => void> =>
  createListener<ConnectionStatus>(
    EVENT,
    (status) => {
      const wasConnected = connectionStatusStore.isConnected;
      setConnectionStatusStore(status);
      if (!status.isConnected) {
        disconnectCapabilities();
      } else if (!wasConnected) {
        refreshCapabilities().catch((error: unknown) => {
          logWarn('Could not discover ROV capabilities', error);
        });
      }
    },
    { warnOnly: true },
  );
