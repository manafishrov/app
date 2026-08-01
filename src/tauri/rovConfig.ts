import { createSignal } from 'solid-js';
import { unwrap } from 'solid-js/store';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { setRovConfigStore, rovConfigStore, type RovConfig } from '@/stores/rovConfig';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'rov_config_received';

const resolveVoid: () => void = () => 0;
const [rovConfigRevision, setRovConfigRevision] = createSignal(0);

const applyRemoteRovConfig = (config: RovConfig): void => {
  setRovConfigStore(config);
  setRovConfigRevision((revision) => revision + 1);
};

export const setupRovConfigListener = (): Promise<() => void> =>
  createListener<RovConfig>(EVENT, applyRemoteRovConfig);

export const requestRovConfig = (): Promise<void> | undefined => {
  if (!connectionStatusStore.isConnected) {
    return;
  }

  return invokeCommand('request_rov_config');
};

export const setRovConfig = (newConfigOptions: Partial<RovConfig>): Promise<void> => {
  const previousSnapshot = structuredClone(unwrap(rovConfigStore));
  const optimisticConfig = { ...previousSnapshot, ...newConfigOptions };

  setRovConfigStore(optimisticConfig);

  return invokeCommand('set_rov_config', { payload: newConfigOptions })
    .then(resolveVoid)
    .catch((error: unknown) => {
      setRovConfigStore(previousSnapshot);
      throw error;
    });
};

export const importRovConfig = (payload: unknown): Promise<void> =>
  invokeCommand('import_rov_config', { payload }).then(resolveVoid);

export { rovConfigRevision };
