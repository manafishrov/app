import {
  rovStatusStore,
  setAutoStabilizationOptimistic,
  setDepthHoldOptimistic,
} from '@/stores/rovStatus';
import { invokeCommand } from '@/tauri/core';

export const toggleAutoStabilization = (): Promise<void> => {
  const newValue = !rovStatusStore.autoStabilization;
  setAutoStabilizationOptimistic(newValue);
  return new Promise<void>((resolve) => {
    invokeCommand('toggle_auto_stabilization').then(
      () => {
        resolve();
      },
      () => {
        setAutoStabilizationOptimistic(!newValue);
        resolve();
      },
    );
  });
};

export const toggleDepthHold = (): Promise<void> => {
  const newValue = !rovStatusStore.depthHold;
  setDepthHoldOptimistic(newValue);
  return new Promise<void>((resolve) => {
    invokeCommand('toggle_depth_hold').then(
      () => {
        resolve();
      },
      () => {
        setDepthHoldOptimistic(!newValue);
        resolve();
      },
    );
  });
};
