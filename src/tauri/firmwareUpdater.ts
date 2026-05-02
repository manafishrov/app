import { toast } from '@manafishrov/ui/toaster';

import { logError, logInfo } from '@/lib/log';
import { isNewerVersion } from '@/lib/version';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import {
  setFirmwareUpdateState,
  updatesStore,
  type FirmwareArtifact,
  type FirmwareReleaseManifest,
} from '@/stores/updates';
import {
  FIRMWARE_UPDATE_HTTP_PORT,
  FIRMWARE_UPDATE_MANIFEST_URL,
  FIRMWARE_UPDATE_TOAST_ID,
} from '@/tauri/constants';
import { createListener, invokeCommand, type CleanupFn } from '@/tauri/core';

type FirmwareManifestRequest = {
  manifestUrl: string;
};

type FirmwareDownloadRequest = {
  artifactUrl: string;
  signatureUrl: string;
  fileName: string;
  sha256: string;
  size: number;
};

type FirmwareUploadRequest = {
  filePath: string;
  uploadUrl: string;
  fileName: string;
  systemPath: string;
};

type FirmwareUpdateProgress = {
  phase: 'downloading' | 'verifying' | 'uploading';
  percent: number;
};

const FIRMWARE_UPDATE_PROGRESS_EVENT = 'firmware_update_progress';

const firmwareUpdateSavedTo = (path: string): string =>
  m.toasts_firmware_update_downloaded_path({ path });
const createFirmwareUploadUrl = (): string =>
  `http://${rovConfigStore.ipAddress}:${FIRMWARE_UPDATE_HTTP_PORT}/firmware/update`;

const createFirmwareProgressTitle = (payload: FirmwareUpdateProgress): string => {
  switch (payload.phase) {
    case 'downloading': {
      return m.toasts_firmware_update_downloading_progress({ percent: payload.percent });
    }
    case 'verifying': {
      return m.toasts_firmware_update_verifying_progress({ percent: payload.percent });
    }
    case 'uploading': {
      return m.toasts_firmware_update_uploading({ percent: payload.percent });
    }
    default: {
      return m.toasts_firmware_update_installing({ percent: payload.percent });
    }
  }
};

const handleFirmwareUpdateProgress = (payload: FirmwareUpdateProgress): void => {
  toast.update(FIRMWARE_UPDATE_TOAST_ID, {
    title: createFirmwareProgressTitle(payload),
    type: 'loading',
  });
};

export const setupFirmwareUpdateProgressListener = (): Promise<CleanupFn> =>
  createListener<FirmwareUpdateProgress>(
    FIRMWARE_UPDATE_PROGRESS_EVENT,
    handleFirmwareUpdateProgress,
  );

const resolveFirmwareStatus = (
  latestVersion: string,
  currentVersion: string,
): 'checked' | 'upToDate' | 'available' => {
  if (isNewerVersion(latestVersion, currentVersion)) {
    return 'available';
  }

  const trimmedCurrentVersion = currentVersion.trim();
  if (trimmedCurrentVersion === '' || trimmedCurrentVersion.toUpperCase() === 'N/A') {
    return 'checked';
  }

  return 'upToDate';
};

const getClosureArtifact = (manifest: FirmwareReleaseManifest | null): FirmwareArtifact | null => {
  if (!manifest) {
    return null;
  }

  return manifest.artifacts.find((artifact) => artifact.kind === 'system-closure') ?? null;
};

const createDownloadPayload = (artifact: FirmwareArtifact): FirmwareDownloadRequest => ({
  artifactUrl: artifact.url,
  signatureUrl: artifact.signature ? artifact.signature.url : '',
  fileName: artifact.name,
  sha256: artifact.sha256,
  size: artifact.size,
});

const createUploadPayload = (
  artifact: FirmwareArtifact,
  manifest: FirmwareReleaseManifest,
  downloadedPath: string,
): FirmwareUploadRequest => ({
  filePath: downloadedPath,
  uploadUrl: createFirmwareUploadUrl(),
  fileName: artifact.name,
  systemPath: manifest.offlineInstall.systemPath,
});

export const refreshFirmwareUpdateStatus = (): void => {
  const { manifest } = updatesStore.firmware;
  if (!manifest) {
    return;
  }

  setFirmwareUpdateState({
    status: resolveFirmwareStatus(manifest.version, rovConfigStore.firmwareVersion),
  });
};

const showFirmwareUpdateAvailableToast = (version: string): void => {
  toast.create({
    title: m.toasts_update_available(),
    description: m.toasts_firmware_update_available_description({ version }),
    type: 'info',
  });
};

const handleFirmwareUploadAccepted = (downloadedPath: string): void => {
  setFirmwareUpdateState({
    downloadedPath,
    error: null,
    status: 'installing',
  });
  toast.update(FIRMWARE_UPDATE_TOAST_ID, {
    title: m.toasts_firmware_update_installing({ percent: 0 }),
    description: m.toasts_firmware_update_accepted_description(),
    type: 'loading',
  });
  logInfo('Firmware update accepted by ROV:', downloadedPath);
};

const handleFirmwareUpdateFailure = (error: unknown): void => {
  logError('Failed to update firmware:', error);
  setFirmwareUpdateState({
    error: m.toasts_firmware_update_failed(),
    status: updatesStore.firmware.manifest ? 'available' : 'error',
  });
  toast.update(FIRMWARE_UPDATE_TOAST_ID, {
    title: m.toasts_firmware_update_failed(),
    type: 'error',
  });
};

const handleFirmwareDownloadComplete = (
  artifact: FirmwareArtifact,
  manifest: FirmwareReleaseManifest,
  downloadedPath: string,
): Promise<string> => {
  setFirmwareUpdateState({
    downloadedPath,
    error: null,
    status: 'uploading',
  });
  toast.update(FIRMWARE_UPDATE_TOAST_ID, {
    title: m.toasts_firmware_update_uploading({ percent: 0 }),
    description: firmwareUpdateSavedTo(downloadedPath),
    type: 'loading',
  });

  return invokeCommand<unknown>('upload_firmware_update', {
    payload: createUploadPayload(artifact, manifest, downloadedPath),
  }).then(() => downloadedPath);
};

export const checkForFirmwareUpdates = (showAvailableToast = false): Promise<void> => {
  setFirmwareUpdateState({
    downloadedPath: null,
    error: null,
    status: 'checking',
  });

  return invokeCommand<FirmwareReleaseManifest>('check_firmware_update', {
    payload: { manifestUrl: FIRMWARE_UPDATE_MANIFEST_URL } satisfies FirmwareManifestRequest,
  })
    .then((manifest) => {
      const status = resolveFirmwareStatus(manifest.version, rovConfigStore.firmwareVersion);
      setFirmwareUpdateState({
        error: null,
        manifest,
        status,
      });
      if (showAvailableToast && status === 'available') {
        showFirmwareUpdateAvailableToast(manifest.version);
      }
      logInfo('Firmware manifest checked:', manifest.version);
    })
    .catch((error: unknown) => {
      logError('Failed to check for firmware updates:', error);
      setFirmwareUpdateState({
        error: m.general_rov_settings_firmware_update_check_failed(),
        status: 'error',
      });
    });
};

export const downloadFirmwareUpdate = (): Promise<void> => {
  const { manifest } = updatesStore.firmware;
  const artifact = getClosureArtifact(manifest);
  if (!manifest || !artifact || !artifact.signature || artifact.signature.format !== 'minisign') {
    setFirmwareUpdateState({
      error: m.general_rov_settings_firmware_update_not_available(),
      status: 'error',
    });
    return Promise.resolve();
  }

  setFirmwareUpdateState({
    downloadedPath: null,
    error: null,
    status: 'downloading',
  });

  toast.create({
    id: FIRMWARE_UPDATE_TOAST_ID,
    title: m.toasts_firmware_update_downloading_progress({ percent: 0 }),
    type: 'loading',
  });

  return invokeCommand<string>('download_firmware_update', {
    payload: createDownloadPayload(artifact),
  })
    .then((downloadedPath) => handleFirmwareDownloadComplete(artifact, manifest, downloadedPath))
    .then((downloadedPath) => {
      setFirmwareUpdateState({
        downloadedPath,
        error: null,
        status: 'installing',
      });
      handleFirmwareUploadAccepted(downloadedPath);
    })
    .catch((error: unknown) => {
      handleFirmwareUpdateFailure(error);
    });
};
