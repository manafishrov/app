import type { Update } from '@tauri-apps/plugin-updater';

import { createStore, reconcile } from 'solid-js/store';

export type FirmwareArtifactSignature = {
  url: string;
  format: string;
};

export type FirmwareArtifact = {
  name: string;
  kind: string;
  format: string;
  url: string;
  size: number;
  sha256: string;
  signature?: FirmwareArtifactSignature;
};

export type FirmwareReleaseManifest = {
  version: string;
  product: string;
  publishedAt: string;
  releaseUrl: string;
  offlineInstall: {
    systemPath: string;
    closureFormat: string;
    importCommand: string;
  };
  signing: {
    enabled: boolean;
    scheme: string | null;
  };
  artifacts: FirmwareArtifact[];
};

type AppUpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'installing'
  | 'readyToRestart'
  | 'error';

type FirmwareUpdateStatus =
  | 'idle'
  | 'checking'
  | 'checked'
  | 'upToDate'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'uploading'
  | 'installing'
  | 'error';

type AppUpdateState = {
  availableUpdate: Update | null;
  latestVersion: string | null;
  status: AppUpdateStatus;
  error: string | null;
};

type FirmwareUpdateState = {
  manifest: FirmwareReleaseManifest | null;
  downloadedPath: string | null;
  status: FirmwareUpdateStatus;
  error: string | null;
};

type UpdatesState = {
  app: AppUpdateState;
  firmware: FirmwareUpdateState;
};

const defaultUpdatesState: UpdatesState = {
  app: {
    availableUpdate: null,
    latestVersion: null,
    status: 'idle',
    error: null,
  },
  firmware: {
    manifest: null,
    downloadedPath: null,
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

export const setFirmwareUpdateState = (value: Partial<FirmwareUpdateState>): void => {
  setUpdatesStoreInternal(
    'firmware',
    reconcile({
      ...updatesStore.firmware,
      ...value,
    }),
  );
};

export { updatesStore };
