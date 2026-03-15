import {
  rovStatusStore,
  setAutoStabilizationOptimistic,
  setDepthHoldOptimistic,
} from '@/stores/rovStatus';
import { invokeCommand } from '@/tauri/core';

export const toggleAutoStabilization = async (): Promise<void> => {
  const newValue = !rovStatusStore.autoStabilization;
  setAutoStabilizationOptimistic(newValue);
  try {
    await invokeCommand('toggle_auto_stabilization');
  } catch {
    setAutoStabilizationOptimistic(!newValue);
  }
};

export const toggleDepthHold = async (): Promise<void> => {
  const newValue = !rovStatusStore.depthHold;
  setDepthHoldOptimistic(newValue);
  try {
    await invokeCommand('toggle_depth_hold');
  } catch {
    setDepthHoldOptimistic(!newValue);
  }
};
