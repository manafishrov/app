import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

import { toast } from '@/components/ui/Toaster';

type DeviceStatusStore = {
  isConnected: boolean;
  waterDetected: boolean;
  lastUpdated: Date | null;
  isPolling: boolean;
  checkConnectionStatus: () => Promise<void>;
  checkWaterSensorStatus: () => Promise<void>;
  checkAllStatuses: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
};

const useDeviceStatusStore = create<DeviceStatusStore>((set, get) => {
  let pollingInterval: number | null = null;

  return {
    isConnected: false,
    waterDetected: false,
    lastUpdated: null,
    isPolling: false,

    checkConnectionStatus: async () => {
      try {
        const isConnected = await invoke<boolean>('get_connection_status');
        set({
          isConnected,
          lastUpdated: new Date(),
        });
      } catch (error) {
        console.error('Failed to get connection status:', error);
        toast.warning('Failed to get connection status');
        set({
          isConnected: false,
          lastUpdated: new Date(),
        });
      }
    },

    checkWaterSensorStatus: async () => {
      try {
        const waterDetected = await invoke<boolean>('get_water_sensor_status');
        const prevState = get().waterDetected;

        set({
          waterDetected,
          lastUpdated: new Date(),
        });

        if (waterDetected && !prevState) {
          toast.error('ALERT: Water detected inside ROV!');
        }
      } catch (error) {
        console.error('Failed to get water sensor status:', error);
        toast.warning('Failed to get water sensor status');
      }
    },

    checkAllStatuses: async () => {
      await Promise.allSettled([
        get().checkConnectionStatus(),
        get().checkWaterSensorStatus(),
      ]);
    },

    startPolling: () => {
      if (get().isPolling) return;

      void get().checkAllStatuses();

      pollingInterval = window.setInterval(() => {
        void get().checkAllStatuses();
      }, 1000);

      set({ isPolling: true });
    },

    stopPolling: () => {
      if (pollingInterval !== null) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        set({ isPolling: false });
      }
    },
  };
});

setTimeout(() => {
  useDeviceStatusStore.getState().startPolling();
}, 0);

export { useDeviceStatusStore };
