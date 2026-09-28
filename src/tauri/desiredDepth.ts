import { invokeAction } from '@/tauri/capabilities';

export const setDesiredDepth = (depth: number): Promise<void> =>
  invokeAction('rov.desiredDepth.set', 'press', depth);
