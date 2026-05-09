import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { revealItemInDir } from '@tauri-apps/plugin-opener';

import { logError } from '@/lib/log';
import {
  setFirmwareUpdateState,
  updatesStore,
  type FirmwareArtifact,
  type FirmwareReleaseManifest,
  type FlashDrive,
} from '@/stores/updates';

const FIRMWARE_MANIFEST_URL =
  'https://s3.manafishrov.com/manafishrov-firmware/releases/latest.json';
const DOWNLOAD_PROGRESS_EVENT = 'firmware_download_progress';
const FLASH_PROGRESS_EVENT = 'firmware_flash_progress';

type DownloadProgressPayload = {
  phase: 'downloading' | 'verifying' | 'completed';
  percent: number;
  bytesDone: number;
  totalBytes: number;
};

type FlashStatusPayload =
  | { phase: 'starting' }
  | { phase: 'decompressing'; bytesProcessed: number; totalBytes: number }
  | { phase: 'flashing'; bytesWritten: number; totalBytes: number; bytesPerSecond: number }
  | { phase: 'verifying'; bytesVerified: number; totalBytes: number }
  | { phase: 'completed' }
  | { phase: 'error'; message: string };

const findSdImage = (manifest: FirmwareReleaseManifest): FirmwareArtifact | undefined =>
  manifest.artifacts.find((artifact) => artifact.kind === 'sd-image');

export const checkForFirmwareUpdates = async (): Promise<void> => {
  setFirmwareUpdateState({ status: 'checking', error: null, manifest: null });
  try {
    const manifest = await invoke<FirmwareReleaseManifest>('check_firmware_update', {
      payload: { manifestUrl: FIRMWARE_MANIFEST_URL },
    });
    setFirmwareUpdateState({
      status: findSdImage(manifest) ? 'available' : 'checked',
      manifest,
    });
  } catch (error: unknown) {
    logError('Failed to check for firmware updates:', error);
    setFirmwareUpdateState({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const downloadFirmwareUpdate = async (): Promise<void> => {
  const { manifest } = updatesStore.firmware;
  if (manifest === null) {
    return;
  }
  const artifact = findSdImage(manifest);
  if (artifact === undefined) {
    setFirmwareUpdateState({
      status: 'error',
      error: 'Manifest has no SD image artifact to download.',
    });
    return;
  }

  setFirmwareUpdateState({
    status: 'downloading',
    error: null,
    downloadPercent: 0,
    downloadedPath: null,
  });
  try {
    const path = await invoke<string>('download_firmware_update', {
      payload: {
        artifactUrl: artifact.url,
        signatureUrl: artifact.signature?.url ?? undefined,
        fileName: artifact.name,
        sha256: artifact.sha256,
        size: artifact.size,
      },
    });
    setFirmwareUpdateState({
      status: 'downloaded',
      downloadedPath: path,
      downloadPercent: 100,
    });
  } catch (error: unknown) {
    logError('Failed to download firmware:', error);
    setFirmwareUpdateState({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const revealDownloadedFirmware = (): void => {
  const path = updatesStore.firmware.downloadedPath;
  if (path === null) {
    return;
  }
  revealItemInDir(path).catch(logError);
};

export const setupFirmwareDownloadListener = (): Promise<UnlistenFn> =>
  listen<DownloadProgressPayload>(DOWNLOAD_PROGRESS_EVENT, ({ payload }) => {
    const status =
      payload.phase === 'verifying'
        ? 'verifying'
        : payload.phase === 'completed'
          ? 'downloaded'
          : 'downloading';
    setFirmwareUpdateState({ status, downloadPercent: payload.percent });
  });

export const setupFirmwareFlashListener = (): Promise<UnlistenFn> =>
  listen<FlashStatusPayload>(FLASH_PROGRESS_EVENT, ({ payload }) => {
    if (payload.phase === 'flashing') {
      setFirmwareUpdateState({
        status: 'flashing',
        flashBytesWritten: payload.bytesWritten,
        flashTotalBytes: payload.totalBytes,
        flashBytesPerSecond: payload.bytesPerSecond,
      });
    } else if (payload.phase === 'verifying') {
      setFirmwareUpdateState({
        status: 'flashing-verifying',
        flashBytesWritten: payload.bytesVerified,
        flashTotalBytes: payload.totalBytes,
      });
    } else if (payload.phase === 'completed') {
      setFirmwareUpdateState({ status: 'flashed' });
    } else if (payload.phase === 'error') {
      setFirmwareUpdateState({ status: 'error', error: payload.message });
    } else if (payload.phase === 'decompressing' || payload.phase === 'starting') {
      setFirmwareUpdateState({ status: 'flashing' });
    }
  });

export const refreshFlashDrives = async (): Promise<void> => {
  try {
    const drives = await invoke<FlashDrive[]>('list_flash_drives');
    setFirmwareUpdateState({ drives });
  } catch (error: unknown) {
    logError('Failed to list flash drives:', error);
    setFirmwareUpdateState({
      drives: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const selectFlashDrive = (device: string | null): void => {
  setFirmwareUpdateState({ selectedDevice: device });
};

export const startFirmwareFlash = async (): Promise<void> => {
  const { firmware } = updatesStore;
  if (firmware.downloadedPath === null) {
    return;
  }
  if (firmware.selectedDevice === null) {
    return;
  }
  const { manifest } = firmware;
  if (manifest === null) {
    return;
  }
  const artifact = findSdImage(manifest);
  if (artifact === undefined) {
    return;
  }

  setFirmwareUpdateState({
    status: 'flashing',
    error: null,
    flashBytesWritten: 0,
    flashTotalBytes: artifact.size,
    flashBytesPerSecond: 0,
  });
  try {
    await invoke<void>('start_flash', {
      payload: {
        imagePath: firmware.downloadedPath,
        device: firmware.selectedDevice,
        imageSize: artifact.size,
        verify: false,
      },
    });
    setFirmwareUpdateState({ status: 'flashed' });
  } catch (error: unknown) {
    logError('Flash failed:', error);
    setFirmwareUpdateState({
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const cancelFirmwareFlash = async (): Promise<void> => {
  try {
    await invoke<void>('cancel_flash');
  } catch (error: unknown) {
    logError('Cancel flash failed:', error);
  }
};
