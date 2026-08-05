import { invokeCommand } from '@/tauri/core';

export const flashEscFirmware = (): Promise<void> => invokeCommand<undefined>('flash_esc_firmware');
