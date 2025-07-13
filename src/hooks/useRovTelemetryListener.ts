import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { logWarn } from '@/lib/log';

import { type RovTelemetry, rovTelemetryStore } from '@/stores/rovTelemetry';

function useRovTelemetryListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<RovTelemetry>('rov_telemetry', ({payload}) => {
          rovTelemetryStore.setState(() => payload);
        });
      } catch (error) {
        logWarn('Failed to listen to ROV telemetry:', error);
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useRovTelemetryListener };
