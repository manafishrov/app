import { invoke } from '@tauri-apps/api/core';

import type { MicrocontrollerFirmwareVariant } from '@/stores/rovConfig';

export const flashMicrocontrollerFirmware = (
  variant: MicrocontrollerFirmwareVariant,
): Promise<void> =>
  invoke<undefined>('flash_microcontroller_firmware', {
    payload: variant,
  });
