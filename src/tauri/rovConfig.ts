import { unwrap } from 'solid-js/store';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { setRovConfigStore, rovConfigStore, type RovConfig } from '@/stores/rovConfig';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'rov_config_received';
const WRITE_TIMEOUT_MS = 5000;

const resolveVoid: () => void = () => 0;

let isRovConfigWritePending = false;
let writeTimeout = 0;

const clearPendingRovConfigWrite = (): void => {
  isRovConfigWritePending = false;

  if (writeTimeout > 0) {
    clearTimeout(writeTimeout);
    writeTimeout = 0;
  }
};

const markPendingRovConfigWrite = (): void => {
  clearPendingRovConfigWrite();
  isRovConfigWritePending = true;
  writeTimeout = setTimeout(() => {
    clearPendingRovConfigWrite();
  }, WRITE_TIMEOUT_MS);
};

const handleRovConfigReceived = (payload: RovConfig): void => {
  clearPendingRovConfigWrite();
  setRovConfigStore(payload);
};

export const setupRovConfigListener = (): Promise<() => void> =>
  createListener<RovConfig>(EVENT, handleRovConfigReceived);

export { clearPendingRovConfigWrite };

export const requestRovConfig = (): Promise<void> | undefined => {
  if (!connectionStatusStore.isConnected || isRovConfigWritePending) {
    return;
  }

  return invokeCommand('request_rov_config');
};

export const setRovConfig = (newConfigOptions: Partial<RovConfig>): Promise<void> => {
  const previousSnapshot = structuredClone(unwrap(rovConfigStore));
  const optimisticConfig = { ...previousSnapshot, ...newConfigOptions };

  markPendingRovConfigWrite();
  setRovConfigStore(optimisticConfig);

  return invokeCommand('set_rov_config', { payload: newConfigOptions })
    .then(resolveVoid)
    .catch((error: unknown) => {
      clearPendingRovConfigWrite();
      setRovConfigStore(previousSnapshot);
      throw error;
    });
};
