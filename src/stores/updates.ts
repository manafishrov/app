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
  releaseNotes: string | undefined;
  status: AppUpdateStatus;
  error: string | undefined;
};

const ReleasesStatus = {
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  error: 'error',
} as const;

type ReleasesStatus = (typeof ReleasesStatus)[keyof typeof ReleasesStatus];

export type AppReleaseEntry = {
  version: string;
  tag: string;
  publishedAt: string;
  prerelease: boolean;
  releaseNotes?: string;
};

type AppReleasesState = {
  status: ReleasesStatus;
  error: string | undefined;
  entries: AppReleaseEntry[];
  installingTag: string | undefined;
};

type UpdatesState = {
  app: AppUpdateState;
  releases: AppReleasesState;
};

const defaultUpdatesState: UpdatesState = {
  app: {
    availableUpdate: UNSET,
    latestVersion: UNSET,
    releaseNotes: UNSET,
    status: 'idle',
    error: UNSET,
  },
  releases: {
    status: ReleasesStatus.idle,
    error: UNSET,
    entries: [],
    installingTag: UNSET,
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

export const setAppReleasesState = (value: Partial<AppReleasesState>): void => {
  setUpdatesStoreInternal(
    'releases',
    reconcile({
      ...updatesStore.releases,
      ...value,
    }),
  );
};

export { ReleasesStatus, updatesStore };
