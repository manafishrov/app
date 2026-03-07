import { connectionStatusStore } from '@/stores/connectionStatus';
import { setRovConfigStore, rovConfigStore, type RovConfig } from '@/stores/rovConfig';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'rov_config_received';

export const setupRovConfigListener = () => createListener<RovConfig>(EVENT, setRovConfigStore);

export const requestRovConfig = async () => {
  if (!connectionStatusStore.isConnected) {return;}
  await invokeCommand('request_rov_config');
};

export const setRovConfig = async (newConfigOptions: Partial<RovConfig>) => {
  const currentRovConfig = { ...rovConfigStore };
  const newRovConfig = { ...currentRovConfig, ...newConfigOptions };

  setRovConfigStore(newRovConfig);

  await invokeCommand('set_rov_config', { payload: newRovConfig }).catch((error) => {
    setRovConfigStore(currentRovConfig);
    throw error;
  });
};
