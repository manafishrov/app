import { listen } from '@tauri-apps/api/event';
import { logWarn } from '@/lib/log';

import { type Status, statusStore } from '@/stores/statusStore';

async function initializeStatusListener() {
  try {
    await listen<Status>('status', (event) => {
      statusStore.setState(() => event.payload);
    });
  } catch (error) {
    logWarn('Failed to listen to status updates:', error);
  }
}

void initializeStatusListener();
