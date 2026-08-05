import { invoke } from '@tauri-apps/api/core';

export const flashEscFirmware = (): Promise<void> => invoke<undefined>('flash_esc_firmware');
