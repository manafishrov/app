import { listen } from '@tauri-apps/api/event';

import { logWarn } from '@/lib/log';

import { type Settings, settingsStore } from '@/stores/settingsStore';

async function initializeSettingsListener() {
  try {
    await listen<Settings>('settings', (event) => {
      settingsStore.setState(() => event.payload);
    });
  } catch (error) {
    logWarn('Failed to listen to setting updates:', error);
  }
}

void initializeSettingsListener();
