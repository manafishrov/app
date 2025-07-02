import { listen } from '@tauri-apps/api/event';

import { logWarn } from '@/lib/log';

import { type States, stateStore } from '@/stores/stateStore';

async function initializeStatesListener() {
  try {
    await listen<States>('states', (event) => {
      stateStore.setState(() => event.payload);
    });
  } catch (error) {
    logWarn('Failed to listen to state updates:', error);
  }
}

void initializeStatesListener();
