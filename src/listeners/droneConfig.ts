import { listen } from '@tauri-apps/api/event';

import { logError } from '@/lib/log';

import {
  type ThrusterAllocation,
  type ThrusterPinSetup,
  droneConfigStore,
} from '@/stores/droneConfigStore';

async function initializeDroneConfigListener() {
  try {
    await listen<ThrusterPinSetup>('thruster_pin_setup', (event) => {
      droneConfigStore.setState((config) => ({
        ...config,
        thrusterPinSetup: event.payload,
      }));
    });
    await listen<ThrusterAllocation>('thruster_allocation', (event) => {
      droneConfigStore.setState((config) => ({
        ...config,
        thrusterAllocation: event.payload,
      }));
    });
  } catch (error) {
    logError('Failed to listen to drone config messages:', error);
  }
}

void initializeDroneConfigListener();
