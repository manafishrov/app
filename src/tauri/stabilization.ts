import { invokeCommand } from '@/tauri/core';

export const toggleAutoStabilization = (): Promise<void> =>
  invokeCommand('toggle_auto_stabilization');

export const toggleDepthHold = (): Promise<void> => invokeCommand('toggle_depth_hold');
