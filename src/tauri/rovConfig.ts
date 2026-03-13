import { connectionStatusStore } from '@/stores/connectionStatus';
import { setRovConfigStore, rovConfigStore, type RovConfig } from '@/stores/rovConfig';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'rov_config_received';

const resolveVoid: () => void = () => 0;

export const setupRovConfigListener = (): Promise<() => void> =>
  createListener<RovConfig>(EVENT, setRovConfigStore);

export const requestRovConfig = (): Promise<void> | undefined => {
  if (!connectionStatusStore.isConnected) {
    return;
  }
  return invokeCommand('request_rov_config');
};

export const setRovConfig = (newConfigOptions: Partial<RovConfig>): Promise<void> => {
  const currentRovConfig = { ...rovConfigStore };
  const newRovConfig = { ...currentRovConfig, ...newConfigOptions };

  setRovConfigStore(newRovConfig);

  return invokeCommand('set_rov_config', { payload: newRovConfig })
    .then(resolveVoid)
    .catch((error: unknown) => {
      setRovConfigStore(currentRovConfig);
      throw error;
    });
};
