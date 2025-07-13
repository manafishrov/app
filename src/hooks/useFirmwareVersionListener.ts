import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { firmwareVersionStore } from '@/stores/firmwareVersion';

function useFirmwareVersionListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    void (async () => {
      try {
        unlisten = await listen<string>(
          'firmware_version_recieved',
          ({ payload }) => {
            firmwareVersionStore.setState(() => payload);
          },
        );
      } catch (error) {
        logError('Failed to listen for firmware version:', error);
        toast.error('Failed to listen for firmware version');
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useFirmwareVersionListener };
