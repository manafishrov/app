import { invokeCommand } from '@/tauri/core';

export const sendCustomAction = (action: string): Promise<void> =>
  invokeCommand('send_custom_action', { payload: action });
