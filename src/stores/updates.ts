import type { Update } from '@tauri-apps/plugin-updater';

import { createStore, reconcile } from 'solid-js/store';

type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'installing'
  | 'readyToRestart'
  | 'error';

type AppUpdateState = {
  availableUpdate: Update | null;
  latestVersion: string | null;
  status: AppUpdateStatus;
  error: string | null;
};

type UpdatesState = {
  app: AppUpdateState;
};

const defaultUpdatesState: UpdatesState = {
  app: {
    availableUpdate: null,
    latestVersion: null,
    status: 'idle',
    error: null,
  },
};

const [updatesStore, setUpdatesStoreInternal] = createStore<UpdatesState>(defaultUpdatesState);

export const setAppUpdateState = (value: Partial<AppUpdateState>): void => {
  setUpdatesStoreInternal(
    'app',
    reconcile({
      ...updatesStore.app,
      ...value,
    }),
  );
};

export { updatesStore };
