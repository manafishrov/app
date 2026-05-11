import { createStore, produce, reconcile } from 'solid-js/store';

const [UNSET]: undefined[] = [];

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
  signing: { enabled: boolean; scheme: string | null };
  artifacts: FirmwareArtifact[];
};

export type FirmwareRelease = {
  version: string;
  publishedAt: string;
  prerelease: boolean;
};

export type FlashDriveMountpoint = {
  path: string;
  label: string | null;
};

export type FlashDrive = {
  device: string;
  rawDevice: string;
  description: string;
  size: number;
  blockSize: number;
  isReadOnly: boolean;
  isRemovable: boolean;
  isUSB: boolean;
  isCard: boolean;
  isSystem: boolean;
  mountpoints: FlashDriveMountpoint[];
};

const VersionsStatus = {
  idle: 'idle',
  loading: 'loading',
  ready: 'ready',
  error: 'error',
} as const;

type VersionsStatus = (typeof VersionsStatus)[keyof typeof VersionsStatus];

const PipelineStatus = {
  idle: 'idle',
  preparing: 'preparing',
  downloading: 'downloading',
  verifying: 'verifying',
  flashing: 'flashing',
  flashingVerifying: 'flashing-verifying',
  flashed: 'flashed',
  cancelled: 'cancelled',
  error: 'error',
} as const;

type PipelineStatus = (typeof PipelineStatus)[keyof typeof PipelineStatus];

export type VersionEntryState = {
  version: string;
  publishedAt: string;
  prerelease: boolean;
};

type SdFlashState = {
  versionsStatus: VersionsStatus;
  versionsError: string | undefined;
  versions: VersionEntryState[];
  drives: FlashDrive[];
  selectedDevice: string | undefined;
  flash: {
    status: PipelineStatus;
    activeVersion: string | undefined;
    downloadPercent: number;
    bytesWritten: number;
    totalBytes: number;
    bytesPerSecond: number;
    error: string | undefined;
  };
};

const defaultSdFlashState: SdFlashState = {
  versionsStatus: VersionsStatus.idle,
  versionsError: UNSET,
  versions: [],
  drives: [],
  selectedDevice: UNSET,
  flash: {
    status: PipelineStatus.idle,
    activeVersion: UNSET,
    downloadPercent: 0,
    bytesWritten: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
    error: UNSET,
  },
};

const [sdFlashStore, setSdFlashStoreInternal] = createStore<SdFlashState>(defaultSdFlashState);

export const setSdFlashState = (value: Partial<SdFlashState>): void => {
  setSdFlashStoreInternal(
    produce((state) => {
      Object.assign(state, value);
    }),
  );
};

export const setSdFlashFlashState = (value: Partial<SdFlashState['flash']>): void => {
  setSdFlashStoreInternal(
    'flash',
    produce((flash) => {
      Object.assign(flash, value);
    }),
  );
};

export const findVersionEntry = (version: string): VersionEntryState | undefined =>
  sdFlashStore.versions.find((entry) => entry.version === version);

export const setVersions = (entries: VersionEntryState[]): void => {
  setSdFlashStoreInternal('versions', reconcile(entries));
};

export const isPipelineRunning = (): boolean => {
  const { status } = sdFlashStore.flash;
  return (
    status === PipelineStatus.preparing ||
    status === PipelineStatus.downloading ||
    status === PipelineStatus.verifying ||
    status === PipelineStatus.flashing ||
    status === PipelineStatus.flashingVerifying
  );
};

export { PipelineStatus, VersionsStatus, sdFlashStore };
