import {
  rovStatusStore,
  setAutoStabilizationOptimistic,
  setDepthHoldOptimistic,
} from '@/stores/rovStatus';
import { invokeCommand } from '@/tauri/core';

export const toggleAutoStabilization = (): Promise<void> => {
  const newValue = !rovStatusStore.autoStabilization;
  setAutoStabilizationOptimistic(newValue);
  return invokeCommand<undefined>('set_auto_stabilization', { enabled: newValue }).catch(
    (error: unknown): never => {
      setAutoStabilizationOptimistic(!newValue);
      throw error;
    },
  );
};

export const toggleDepthHold = (): Promise<void> => {
  const newValue = !rovStatusStore.depthHold;
  setDepthHoldOptimistic(newValue);
  return invokeCommand<undefined>('set_depth_hold', { enabled: newValue }).catch(
    (error: unknown): never => {
      setDepthHoldOptimistic(!newValue);
      throw error;
    },
  );
};
