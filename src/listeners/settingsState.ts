import { listen } from '@tauri-apps/api/event';

import { logWarn } from '@/lib/log';

import {
  type SettingsState,
  settingsStateStore,
} from '@/stores/settingsStateStore';

async function initializeSettingsStateListener() {
  try {
    await listen<SettingsState>('settings_state', (event) => {
      settingsStateStore.setState(() => event.payload);
    });
  } catch (error) {
    logWarn('Failed to listen to settings state updates:', error);
  }
}

void initializeSettingsStateListener();
