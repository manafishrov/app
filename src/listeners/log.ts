import { listen } from '@tauri-apps/api/event';

import { type Log, addLogMessage, logError } from '@/lib/log';

async function initializeLogListener() {
  try {
    await listen<Log>('log_firmware', (event) => {
      void addLogMessage(
        event.payload.message,
        event.payload.level,
        'firmware',
      );
    });
    await listen<Log>('log_backend', (event) => {
      void addLogMessage(event.payload.message, event.payload.level, 'backend');
    });
  } catch (error) {
    logError('Failed to listen to log messages:', error);
  }
}

void initializeLogListener();
