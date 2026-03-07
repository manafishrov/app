import { invoke } from '@tauri-apps/api/core';

import type { MicrocontrollerFirmwareVariant } from '@/stores/rovConfig';

import { setFirmwareVersionStore } from '@/stores/firmwareVersion';
import { createListener } from '@/tauri/core';

const EVENT = 'firmware_version_recieved';

export const setupFirmwareListener = () => createListener<string>(EVENT, setFirmwareVersionStore);

export const flashMicrocontrollerFirmware = async (variant: MicrocontrollerFirmwareVariant) => {
  await invoke('flash_microcontroller_firmware', {
    payload: variant,
  });
};
