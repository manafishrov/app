import { listen } from '@tauri-apps/api/event';

import { type Debug, addDebugMessage } from '@/lib/debug';

async function initializeDebugListener() {
  try {
    await listen<Debug>('debug_firmware', (event) => {
      void addDebugMessage(
        event.payload.message,
        event.payload.logType,
        'Firmware',
      );
    });
    await listen<Debug>('debug_backend', (event) => {
      void addDebugMessage(
        event.payload.message,
        event.payload.logType,
        'Backend',
      );
    });
  } catch (error) {
    console.error('Failed to listen to debug messages:', error);
  }
}

void initializeDebugListener();
