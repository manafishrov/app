import type { Update } from '@tauri-apps/plugin-updater';

import { createStore, reconcile } from 'solid-js/store';

const createNullValue = (): null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null match result');
  }
  return result;
};

export const NULL_VALUE = createNullValue();

type UpdaterState = {
  updateAvailable: Update | null;
};

const defaultUpdaterState: UpdaterState = {
  updateAvailable: NULL_VALUE,
};

const [updaterStore, setUpdaterStoreInternal] = createStore<UpdaterState>(defaultUpdaterState);

const setUpdaterStore = (value: UpdaterState): void => {
  setUpdaterStoreInternal(reconcile(value));
};

export { updaterStore, setUpdaterStore };
