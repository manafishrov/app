import { toast } from '@manafishrov/ui/toaster';

import * as m from '@/paraglide/messages';
import { FIRMWARE_UPDATE_TOAST_ID } from '@/tauri/constants';
import { createListener, type CleanupFn } from '@/tauri/core';

type FirmwareUpdateProgress = {
  phase: 'downloading' | 'verifying' | 'uploading';
  percent: number;
};

const FIRMWARE_UPDATE_PROGRESS_EVENT = 'firmware_update_progress';

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

const createFirmwareProgressDescription = (payload: FirmwareUpdateProgress): string => {
  switch (payload.phase) {
    case 'downloading': {
      return m.toasts_firmware_update_downloading_description();
    }
    case 'verifying': {
      return m.toasts_firmware_update_verifying_description();
    }
    case 'uploading': {
      return m.toasts_firmware_update_uploading_description();
    }
    default: {
      return '';
    }
  }
};

const handleFirmwareUpdateProgress = (payload: FirmwareUpdateProgress): void => {
  toast.update(FIRMWARE_UPDATE_TOAST_ID, {
    title: createFirmwareProgressTitle(payload),
    description: createFirmwareProgressDescription(payload),
    type: 'loading',
  });
};

export const setupFirmwareUpdateProgressListener = (): Promise<CleanupFn> =>
  createListener<FirmwareUpdateProgress>(
    FIRMWARE_UPDATE_PROGRESS_EVENT,
    handleFirmwareUpdateProgress,
  );
