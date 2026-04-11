import { unwrap } from 'solid-js/store';

import { setConfigStore, configStore, type Config } from '@/stores/config';
import { invokeCommand } from '@/tauri/core';

const resolveVoid: () => void = () => 0;

export const getConfig = (): Promise<void> =>
  invokeCommand<Config>('get_config').then((config) => {
    setConfigStore(config);
  });

export const setConfig = (newConfigOptions: Partial<Config>): Promise<void> => {
  const currentConfig = structuredClone(unwrap(configStore));
  const newConfig = { ...currentConfig, ...newConfigOptions };

  setConfigStore(newConfig);

  return invokeCommand('set_config', { payload: newConfig })
    .then(resolveVoid)
    .catch((error: unknown) => {
      setConfigStore(currentConfig);
      throw error;
    });
};
