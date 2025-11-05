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
  depth: number;
  waterTemperature: number;
  electronicsTemperature: number;
  health: SystemHealth;
};

const rovStatusStore = new Store<RovStatus>({
  pitchStabilization: false,
  rollStabilization: false,
  depthHold: false,
  batteryPercentage: 0,
  depth: 0,
  waterTemperature: 0,
  electronicsTemperature: 0,
  health: {
    imuOk: false,
    pressureSensorOk: false,
    microcontrollerOk: false,
  },
});

export { rovStatusStore, type RovStatus };
