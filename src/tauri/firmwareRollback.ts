import { toast } from '@manafishrov/ui/toaster';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { rovConfigStore } from '@/stores/rovConfig';
import { clearUpdateField, setFirmwareUpdateState } from '@/stores/updates';
import { FIRMWARE_UPDATE_HTTP_PORT, FIRMWARE_UPDATE_TOAST_ID } from '@/tauri/constants';
import { invokeCommand } from '@/tauri/core';

type FirmwareRollbackRequest = {
  rollbackUrl: string;
};

const createFirmwareRollbackUrl = (): string =>
  `http://${rovConfigStore.ipAddress}:${FIRMWARE_UPDATE_HTTP_PORT}/firmware/rollback`;

export const manualRollbackFirmware = (): Promise<void> => {
  setFirmwareUpdateState({ error: clearUpdateField(), status: 'rollingBack' });
  toast.create({
    id: FIRMWARE_UPDATE_TOAST_ID,
    title: m.toasts_firmware_update_rolling_back(),
    description: m.toasts_firmware_update_rolling_back_description(),
    type: 'loading',
  });

  return invokeCommand<unknown>('manual_rollback_firmware', {
    payload: { rollbackUrl: createFirmwareRollbackUrl() } satisfies FirmwareRollbackRequest,
  })
    .then(() => {
      clearUpdateField<never>();
    })
    .catch((error: unknown) => {
      logError('Manual rollback failed:', error);
      setFirmwareUpdateState({
        error: m.toasts_firmware_update_rolled_back_description({ message: String(error) }),
        status: 'error',
      });
      toast.update(FIRMWARE_UPDATE_TOAST_ID, {
        title: m.toasts_firmware_install_failed(),
        type: 'error',
      });
    });
};
