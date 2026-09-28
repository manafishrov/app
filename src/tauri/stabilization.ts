import {
  rovStatusStore,
  setAutoStabilizationOptimistic,
  setDepthHoldOptimistic,
} from '@/stores/rovStatus';
import { invokeAction } from '@/tauri/capabilities';

export const toggleAutoStabilization = (): Promise<void> => {
  const newValue = !rovStatusStore.autoStabilization;
  setAutoStabilizationOptimistic(newValue);
  return invokeAction('rov.autoStabilization.set', 'press', newValue).catch(
    (error: unknown): never => {
      setAutoStabilizationOptimistic(!newValue);
      throw error;
    },
  );
};

export const toggleDepthHold = (): Promise<void> => {
  const newValue = !rovStatusStore.depthHold;
  setDepthHoldOptimistic(newValue);
  return invokeAction('rov.depthHold.set', 'press', newValue).catch((error: unknown): never => {
    setDepthHoldOptimistic(!newValue);
    throw error;
  });
};
