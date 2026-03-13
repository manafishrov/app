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

export { rovStatusStore, setRovStatusStore, type RovStatus, type SystemHealth };
