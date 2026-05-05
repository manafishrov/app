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
    bundleFormat: string;
    installCommand: string;
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
  | 'rebooting'
  | 'awaitingMarkGood'
  | 'rollingBack'
  | 'error';

type AppUpdateState = {
  availableUpdate?: Update | undefined;
  latestVersion?: string | undefined;
  status: AppUpdateStatus;
  error?: string | undefined;
};

type FirmwareUpdateState = {
  manifest?: FirmwareReleaseManifest | undefined;
  downloadedPath?: string | undefined;
  status: FirmwareUpdateStatus;
  error?: string | undefined;
};

type UpdatesState = {
  app: AppUpdateState;
  firmware: FirmwareUpdateState;
};

const defaultUpdatesState: UpdatesState = {
  app: {
    status: 'idle',
  },
  firmware: {
    status: 'idle',
  },
};

const [updatesStore, setUpdatesStoreInternal] = createStore<UpdatesState>(defaultUpdatesState);

export const clearUpdateField = <ValueType>(): ValueType | undefined => {
  const emptyValues: ValueType[] = [];
  return emptyValues[0];
};

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
