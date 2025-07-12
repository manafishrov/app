import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { logWarn } from '@/lib/log';

import {
  type ConnectionStatus,
  connectionStatusStore,
} from '@/stores/connectionStatus';

function useConnectionStatusListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<ConnectionStatus>(
          'rov_connection_status_updated',
          (event) => {
            connectionStatusStore.setState(() => event.payload);
          },
        );
      } catch (error) {
        logWarn('Failed to listen to ROV connection status updates:', error);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useConnectionStatusListener };
