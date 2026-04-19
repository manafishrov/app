import { invoke } from '@tauri-apps/api/core';

import type { RovConfig } from '@/stores/rovConfig';

export const flashMcuFirmware = (board: RovConfig['mcuBoard']): Promise<void> =>
  invoke<undefined>('flash_mcu_firmware', {
    payload: board,
  });
