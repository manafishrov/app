import { invoke } from '@tauri-apps/api/core';

import type { MicrocontrollerFirmwareVariant } from '@/stores/rovConfig';

export const flashMicrocontrollerFirmware = async (variant: MicrocontrollerFirmwareVariant) => {
  await invoke('flash_microcontroller_firmware', {
    payload: variant,
  });
};
