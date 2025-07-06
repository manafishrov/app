import { listen } from '@tauri-apps/api/event';
import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import {
  type Regulator,
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
    await listen<Regulator>('regulator', (event) => {
      droneConfigStore.setState((config) => ({
        ...config,
        regulator: event.payload,
      }));
    });
  } catch (error) {
    logError('Failed to listen to drone config messages:', error);
    toast.error('Failed to initialize drone config listener');
  }
}

void initializeDroneConfigListener();
