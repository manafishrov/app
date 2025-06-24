import { listen } from '@tauri-apps/api/event';

import { statusStore, type Status } from '@/stores/statusStore';

async function initializeStatusListener() {
  try {
    await listen<Status>('status_update', (event) => {
      statusStore.setState(() => event.payload);
    });
  } catch (error) {
    console.error('Failed to listen to status updates:', error);
  }
}

void initializeStatusListener();

