import type { RovConfig } from '@/stores/rovConfig';

import { invokeCommand } from '@/tauri/core';

export const flashMcuFirmware = (board: RovConfig['mcuBoard']): Promise<void> =>
  invokeCommand<undefined>('flash_mcu_firmware', {
    payload: board,
  });
