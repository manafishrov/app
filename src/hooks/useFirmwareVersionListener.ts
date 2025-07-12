import { listen } from '@tauri-apps/api/event';
import { useEffect, useState } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

function useFirmwareVersionListener() {
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>(null);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<string>(
          'firmware_version_retrieved',
          (event) => {
            setFirmwareVersion(event.payload);
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

  return firmwareVersion;
}

export { useFirmwareVersionListener };
