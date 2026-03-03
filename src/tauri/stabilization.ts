import { invokeCommand } from '@/tauri/core';

export async function toggleAutoStabilization(): Promise<void> {
  await invokeCommand('toggle_auto_stabilization');
}

export async function toggleDepthHold(): Promise<void> {
  await invokeCommand('toggle_depth_hold');
}
