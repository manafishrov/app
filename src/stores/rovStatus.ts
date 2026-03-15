import { createStore, reconcile } from 'solid-js/store';

type SystemHealth = {
  imuHealthy: boolean;
  pressureSensorHealthy: boolean;
  microcontrollerHealthy: boolean;
};

type RovStatus = {
  autoStabilization: boolean;
  depthHold: boolean;
  batteryPercentage: number;
  health: SystemHealth;
};

const [rovStatusStore, setRovStatusStoreInternal] = createStore<RovStatus>({
  autoStabilization: false,
  depthHold: false,
  batteryPercentage: 0,
  health: {
    imuHealthy: false,
    pressureSensorHealthy: false,
    microcontrollerHealthy: false,
  },
});

const setRovStatusStore = (value: RovStatus): void => {
  setRovStatusStoreInternal(reconcile(value));
};

const setAutoStabilizationOptimistic = (value: boolean): void => {
  setRovStatusStoreInternal('autoStabilization', value);
};

const setDepthHoldOptimistic = (value: boolean): void => {
  setRovStatusStoreInternal('depthHold', value);
};

export {
  rovStatusStore,
  setAutoStabilizationOptimistic,
  setDepthHoldOptimistic,
  setRovStatusStore,
  type RovStatus,
  type SystemHealth,
};
