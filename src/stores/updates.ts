import type { Update } from '@tauri-apps/plugin-updater';

import { createStore, reconcile } from 'solid-js/store';

const [UNSET]: undefined[] = [];

type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'installing'
  | 'readyToRestart'
  | 'error';

type AppUpdateState = {
  availableUpdate: Update | undefined;
  latestVersion: string | undefined;
  status: AppUpdateStatus;
  error: string | undefined;
};

type UpdatesState = {
  app: AppUpdateState;
};

const defaultUpdatesState: UpdatesState = {
  app: {
    availableUpdate: UNSET,
    latestVersion: UNSET,
    status: 'idle',
    error: UNSET,
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
