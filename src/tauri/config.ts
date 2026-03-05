import { setConfigStore, configStore, type Config } from '@/stores/config';
import { invokeCommand } from '@/tauri/core';

export const getConfig = async () => {
  const config = await invokeCommand<Config>('get_config');
  if (config) {
    setConfigStore(config);
  }
};

export const setConfig = async (newConfigOptions: Partial<Config>) => {
  const currentConfig = { ...configStore };
  const newConfig = { ...currentConfig, ...newConfigOptions };

  setConfigStore(newConfig);

  await invokeCommand('set_config', { payload: newConfig }).catch((error) => {
    setConfigStore(currentConfig);
    throw error;
  });
};
