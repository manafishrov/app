import { listen } from '@tauri-apps/api/event';

import { type Settings, settingsStore } from '@/stores/settingsStore';

async function initializeSettingsListener() {
  try {
    await listen<Settings>('settings', (event) => {
      settingsStore.setState(() => event.payload);
    });
  } catch (error) {
    console.error('Failed to listen to setting updates:', error);
  }
}

void initializeSettingsListener();
