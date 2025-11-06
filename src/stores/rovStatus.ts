import { Store } from '@tanstack/react-store';

type SystemHealth = {
  imuOk: boolean;
  pressureSensorOk: boolean;
  microcontrollerOk: boolean;
};

type RovStatus = {
  pitchStabilization: boolean;
  rollStabilization: boolean;
  depthHold: boolean;
  batteryPercentage: number;
  health: SystemHealth;
};

const rovStatusStore = new Store<RovStatus>({
  pitchStabilization: false,
  rollStabilization: false,
  depthHold: false,
  batteryPercentage: 0,
  health: {
    imuOk: false,
    pressureSensorOk: false,
    microcontrollerOk: false,
  },
});

export { rovStatusStore, type RovStatus };
