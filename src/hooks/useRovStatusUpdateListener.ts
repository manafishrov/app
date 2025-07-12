import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { logWarn } from '@/lib/log';

import { type RovStatus, rovStatusStore } from '@/stores/rovStatus';

function useRovStatusUpdateListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<RovStatus>('rov_status_update', (event) => {
          rovStatusStore.setState(() => event.payload);
        });
      } catch (error) {
        logWarn('Failed to listen to ROV status updates:', error);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useRovStatusUpdateListener };
