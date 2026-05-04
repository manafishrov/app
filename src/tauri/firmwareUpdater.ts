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
import { invokeCommand } from '@/tauri/core';

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

const FIRMWARE_CHECK_TOAST_ID = 'firmware-update-check';
const FIRMWARE_CHECK_MIN_VISIBLE_MS = 600;

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });

const createFirmwareUploadUrl = (): string =>
  `http://${rovConfigStore.ipAddress}:${FIRMWARE_UPDATE_HTTP_PORT}/firmware/update`;

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

const showFirmwareCheckToast = (): void => {
  toast.create({
    id: FIRMWARE_CHECK_TOAST_ID,
    title: m.general_rov_settings_firmware_update_status_checking(),
    type: 'loading',
  });
};

const updateFirmwareCheckToast = (
  status: ReturnType<typeof resolveFirmwareStatus>,
  latestVersion: string,
): void => {
  if (status === 'available') {
    toast.update(FIRMWARE_CHECK_TOAST_ID, {
      title: m.toasts_update_available(),
      type: 'success',
    });
    return;
  }

  if (status === 'upToDate') {
    toast.update(FIRMWARE_CHECK_TOAST_ID, {
      title: m.general_rov_settings_firmware_update_status_up_to_date(),
      type: 'success',
    });
    return;
  }

  toast.update(FIRMWARE_CHECK_TOAST_ID, {
    title: m.general_rov_settings_firmware_update_status_latest_available({
      version: latestVersion,
    }),
    type: 'success',
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
    type: 'loading',
  });

  return invokeCommand<unknown>('upload_firmware_update', {
    payload: createUploadPayload(artifact, manifest, downloadedPath),
  }).then(() => downloadedPath);
};

const handleFirmwareCheckSuccess = (
  manifest: FirmwareReleaseManifest,
  showAvailableToast: boolean,
  showCheckingToast: boolean,
): void => {
  const status = resolveFirmwareStatus(manifest.version, rovConfigStore.firmwareVersion);
  setFirmwareUpdateState({
    error: null,
    manifest,
    status,
  });
  if (showAvailableToast && status === 'available') {
    showFirmwareUpdateAvailableToast(manifest.version);
  }
  if (showCheckingToast) {
    updateFirmwareCheckToast(status, manifest.version);
  }
  logInfo('Firmware manifest checked:', manifest.version);
};

const handleFirmwareCheckFailure = (error: unknown, showCheckingToast: boolean): void => {
  logError('Failed to check for firmware updates:', error);
  setFirmwareUpdateState({
    error: m.general_rov_settings_firmware_update_check_failed(),
    status: 'error',
  });
  if (showCheckingToast) {
    toast.update(FIRMWARE_CHECK_TOAST_ID, {
      title: m.general_rov_settings_firmware_update_check_failed(),
      type: 'error',
    });
  }
};

export const checkForFirmwareUpdates = (
  showAvailableToast = false,
  showCheckingToast = false,
): Promise<void> => {
  const visibleDelay = delay(FIRMWARE_CHECK_MIN_VISIBLE_MS);

  if (showCheckingToast) {
    showFirmwareCheckToast();
  }

  setFirmwareUpdateState({
    downloadedPath: null,
    error: null,
    status: 'checking',
  });

  return invokeCommand<FirmwareReleaseManifest>('check_firmware_update', {
    payload: { manifestUrl: FIRMWARE_UPDATE_MANIFEST_URL } satisfies FirmwareManifestRequest,
  })
    .then((manifest) =>
      visibleDelay.then(() => {
        handleFirmwareCheckSuccess(manifest, showAvailableToast, showCheckingToast);
      }),
    )
    .catch((error: unknown) =>
      visibleDelay.then(() => {
        handleFirmwareCheckFailure(error, showCheckingToast);
      }),
    );
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
