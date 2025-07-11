import { listen } from '@tauri-apps/api/event';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { type DroneConfig, droneConfigStore } from '@/stores/droneConfigStore';

async function initializeDroneConfigListener() {
  try {
    await listen<DroneConfig>('drone_config_retrieved', ({ payload }) => {
      droneConfigStore.setState(() => payload);
    });
  } catch (error) {
    logError('Failed to retrieve drone config:', error);
    toast.error('Failed to retrieve drone config');
  }
}

void initializeDroneConfigListener();
