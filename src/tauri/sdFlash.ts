import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import {
  PipelineStatus,
  VersionsStatus,
  findVersionEntry,
  sdFlashStore,
  setSdFlashFlashState,
  setSdFlashState,
  setVersions,
  type FirmwareArtifact,
  type FirmwareRelease,
  type FirmwareReleaseManifest,
  type FlashDrive,
} from '@/stores/sdFlash';

const PERCENT_FULL = 100;
const FLASH_POLL_INTERVAL_MS = 200;
const FIRMWARE_REPO_URL = 'https://github.com/manafishrov/firmware';
const FIRMWARE_S3_BASE = 'https://s3.manafishrov.com/manafishrov-firmware/releases';
const ARTIFACT_PREFIX = 'pi3-imx477';
const DOWNLOAD_PROGRESS_EVENT = 'firmware_download_progress';
const FLASH_PROGRESS_EVENT = 'firmware_flash_progress';
const [UNSET]: undefined[] = [];

const manifestUrlForVersion = (version: string): string =>
  `${FIRMWARE_S3_BASE}/${version}/${ARTIFACT_PREFIX}-${version}.json`;

type DownloadProgressPayload = {
  version: string;
  phase: 'downloading' | 'verifying' | 'completed';
  percent: number;
  bytesDone: number;
  totalBytes: number;
};

type FlashProgressPayload = {
  phase: string;
  bytesWritten: number;
  totalBytes: number;
  bytesPerSecond: number;
  message: string | null;
};

const findSdImage = (manifest: FirmwareReleaseManifest): FirmwareArtifact | undefined =>
  manifest.artifacts.find((artifact) => artifact.kind === 'sd-image');

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isTerminalStatus = (status: string): boolean =>
  status === PipelineStatus.flashed ||
  status === PipelineStatus.cancelled ||
  status === PipelineStatus.error;

export const loadFirmwareVersions = (): Promise<void> => {
  setSdFlashState({ versionsStatus: VersionsStatus.loading, versionsError: UNSET });
  return invoke<FirmwareRelease[]>('list_firmware_releases', {
    payload: { repoUrl: FIRMWARE_REPO_URL },
  })
    .then((releases) => {
      const entries = releases.map((release) => ({
        version: release.version,
        publishedAt: release.publishedAt,
        prerelease: release.prerelease,
        ...(typeof release.releaseNotes === 'string' ? { releaseNotes: release.releaseNotes } : {}),
      }));
      setVersions(entries);
      setSdFlashState({ versionsStatus: VersionsStatus.ready });
    })
    .catch((error: unknown) => {
      logError('Failed to load firmware versions:', error);
      setSdFlashState({ versionsStatus: VersionsStatus.error, versionsError: errorMessage(error) });
    });
};

const fetchManifest = (version: string): Promise<FirmwareReleaseManifest> =>
  invoke<FirmwareReleaseManifest>('fetch_firmware_manifest', {
    payload: { manifestUrl: manifestUrlForVersion(version) },
  });

export const setupFirmwareDownloadListener = (): Promise<UnlistenFn> =>
  listen<DownloadProgressPayload>(DOWNLOAD_PROGRESS_EVENT, ({ payload }) => {
    if (sdFlashStore.flash.activeVersion !== payload.version) {
      return;
    }

    if (payload.phase === 'completed' || isTerminalStatus(sdFlashStore.flash.status)) {
      return;
    }

    setSdFlashFlashState({
      status: payload.phase === 'verifying' ? PipelineStatus.verifying : PipelineStatus.downloading,
      downloadPercent: payload.percent,
      totalBytes: payload.totalBytes,
    });
  });

export const setupFirmwareFlashListener = (): Promise<UnlistenFn> =>
  listen<FlashProgressPayload>(FLASH_PROGRESS_EVENT, ({ payload }) => {
    if (isTerminalStatus(sdFlashStore.flash.status)) {
      return;
    }

    if (payload.phase === 'flashing') {
      setSdFlashFlashState({
        status: PipelineStatus.flashing,
        bytesWritten: payload.bytesWritten,
        totalBytes: payload.totalBytes,
        bytesPerSecond: payload.bytesPerSecond,
      });
    } else if (payload.phase === 'verifying') {
      setSdFlashFlashState({
        status: PipelineStatus.flashingVerifying,
        bytesWritten: payload.bytesWritten,
        totalBytes: payload.totalBytes,
      });
    } else if (payload.phase === 'completed') {
      setSdFlashFlashState({ status: PipelineStatus.flashed });
    } else if (payload.phase === 'error' && typeof payload.message === 'string') {
      setSdFlashFlashState({ status: PipelineStatus.error, error: payload.message });
      toast.create({ title: payload.message, type: 'error' });
    } else if (payload.phase === 'decompressing' || payload.phase === 'starting') {
      setSdFlashFlashState({ status: PipelineStatus.flashing });
    }
  });

export const refreshFlashDrives = (): Promise<void> =>
  invoke<FlashDrive[]>('list_flash_drives')
    .then((drives) => {
      setSdFlashState({ drives });
    })
    .catch((error: unknown) => {
      logError('Failed to list flash drives:', error);
      setSdFlashState({ drives: [], versionsError: errorMessage(error) });
    });

export const selectFlashDrive = (device?: string): void => {
  setSdFlashState({ selectedDevice: device });
};

const requestElevation = (device: string): Promise<undefined> =>
  invoke<undefined>('prepare_flash', { payload: { device } });

const downloadArtifact = (version: string, artifact: FirmwareArtifact): Promise<string> =>
  invoke<string>('download_firmware_update', {
    payload: {
      version,
      artifactUrl: artifact.url,
      signatureUrl: artifact.signature ? artifact.signature.url : UNSET,
      fileName: artifact.name,
      sha256: artifact.sha256,
      size: artifact.size,
    },
  });

const waitForFlashCompletion = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const { status, error } = sdFlashStore.flash;
      if (status === PipelineStatus.flashed) {
        clearInterval(checkInterval);
        resolve();
      } else if (status === PipelineStatus.error) {
        clearInterval(checkInterval);
        reject(new Error(error ?? 'Flash failed'));
      } else if (status === PipelineStatus.cancelled) {
        clearInterval(checkInterval);
        resolve();
      }
    }, FLASH_POLL_INTERVAL_MS);
  });

const signalFlashAndCleanup = (
  downloadedPath: string,
  artifact: FirmwareArtifact,
): Promise<void> => {
  setSdFlashFlashState({
    status: PipelineStatus.flashing,
    downloadPercent: PERCENT_FULL,
    bytesWritten: 0,
    totalBytes: artifact.size,
    bytesPerSecond: 0,
  });

  return invoke<undefined>('signal_flash_image', {
    payload: { imagePath: downloadedPath, imageSize: artifact.size },
  })
    .then(() => waitForFlashCompletion())
    .then(() => {
      invoke<undefined>('cleanup_firmware_cache', {
        payload: { keepFileName: artifact.name },
      }).catch((cleanupError: unknown) => {
        logError('Failed to clean firmware cache:', cleanupError);
      });
    });
};

const createMissingArtifactError = (): Error =>
  new Error('Firmware manifest has no SD image artifact.');

const requireSdImage = (manifest: FirmwareReleaseManifest): FirmwareArtifact => {
  const artifact = findSdImage(manifest);
  if (!artifact) {
    throw createMissingArtifactError();
  }

  return artifact;
};

const initializeFlashState = (version: string): void => {
  setSdFlashFlashState({
    status: PipelineStatus.preparing,
    activeVersion: version,
    downloadPercent: 0,
    bytesWritten: 0,
    totalBytes: 0,
    bytesPerSecond: 0,
    error: UNSET,
  });
};

const beginFlashDownload = (
  version: string,
  device: string,
  artifact: FirmwareArtifact,
): Promise<void> => {
  setSdFlashFlashState({ totalBytes: artifact.size });
  return requestElevation(device)
    .then(() => {
      setSdFlashFlashState({ status: PipelineStatus.downloading });
      return downloadArtifact(version, artifact);
    })
    .then((downloadedPath) => signalFlashAndCleanup(downloadedPath, artifact));
};

const handleFlashFailure = (error: unknown): void => {
  logError('Flash pipeline failed:', error);

  if (sdFlashStore.flash.status === PipelineStatus.cancelled) {
    return;
  }

  const message = errorMessage(error);
  setSdFlashFlashState({ status: PipelineStatus.error, error: message });
  toast.create({ title: message, type: 'error' });
};

export const startFirmwareFlash = (version: string): Promise<void> => {
  const entry = findVersionEntry(version);
  if (!entry) {
    return Promise.resolve();
  }
  const device = sdFlashStore.selectedDevice;
  if (typeof device !== 'string') {
    return Promise.resolve();
  }

  initializeFlashState(version);

  return fetchManifest(version)
    .then((manifest) => requireSdImage(manifest))
    .then((artifact) => beginFlashDownload(version, device, artifact))
    .catch((error: unknown) => {
      handleFlashFailure(error);
    });
};

export const cancelFirmwareFlash = (): Promise<void> =>
  invoke<undefined>('cancel_flash')
    .then(() => {
      setSdFlashFlashState({ status: PipelineStatus.cancelled });
      toast.create({ title: m.sd_flash_flash_status_cancelled(), type: 'info' });
    })
    .catch((error: unknown) => {
      logError('Cancel flash failed:', error);
    });
