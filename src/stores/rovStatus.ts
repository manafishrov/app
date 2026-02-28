import { createStore, reconcile } from 'solid-js/store';

type SystemHealth = {
  imuHealthy: boolean;
  pressureSensorHealthy: boolean;
  microcontrollerHealthy: boolean;
};

type RovStatus = {
  pitchStabilization: boolean;
  rollStabilization: boolean;
  depthHold: boolean;
  batteryPercentage: number;
  health: SystemHealth;
};

const [rovStatusStore, setRovStatusStoreInternal] = createStore<RovStatus>({
  pitchStabilization: false,
  rollStabilization: false,
  depthHold: false,
  batteryPercentage: 0,
  health: {
    imuHealthy: false,
    pressureSensorHealthy: false,
    microcontrollerHealthy: false,
  },
});

function setRovStatusStore(value: RovStatus) {
  setRovStatusStoreInternal(reconcile(value));
}

export { rovStatusStore, setRovStatusStore, type RovStatus, type SystemHealth };
