import { setFirmwareVersionStore } from '@/stores/firmwareVersion';
import { createListener } from '@/tauri/core';

const EVENT = 'firmware_version_recieved';

export const setupFirmwareListener = () => {
  return createListener<string>(EVENT, setFirmwareVersionStore);
};
