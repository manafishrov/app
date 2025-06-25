import { listen } from '@tauri-apps/api/event';

import { type Status, statusStore } from '@/stores/statusStore';

async function initializeStatusListener() {
  try {
    await listen<Status>('status', (event) => {
      statusStore.setState(() => event.payload);
    });
  } catch (error) {
    console.error('Failed to listen to status updates:', error);
  }
}

void initializeStatusListener();
