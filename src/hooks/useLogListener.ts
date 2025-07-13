import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { type LogEntry, createLogRecord, logError } from '@/lib/log';

function useLogListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<LogEntry>('log_message', ({ payload }) => {
          void createLogRecord(payload);
        });
      } catch (error) {
        logError('Failed to listen to log messages:', error);
        toast.error('Failed to listen to log messages');
      }
    })();
    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}

export { useLogListener };
