import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { type RovConfig, rovConfigStore } from '@/stores/rovConfig';

function useRovConfigListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        unlisten = await listen<RovConfig>(
          'rov_config_retrieved',
          ({ payload }) => {
            rovConfigStore.setState(() => payload);
          },
        );
      } catch (error) {
        logError('Failed to listen for ROV config:', error);
        toast.error('Failed to listen for ROV config');
      }
    })();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useRovConfigListener };
