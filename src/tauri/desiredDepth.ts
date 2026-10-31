import { invokeCommand } from '@/tauri/core';

export const setDesiredDepth = (depth: number): Promise<void> =>
  invokeCommand('set_desired_depth', { depth });
