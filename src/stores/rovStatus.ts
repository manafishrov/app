import { Store } from '@tanstack/react-store';

type RovStatus = {
  pitchStabilization: boolean;
  rollStabilization: boolean;
  depthStabilization: boolean;
  batteryPercentage: number;
};

const rovStatusStore = new Store<RovStatus>({
  pitchStabilization: false,
  rollStabilization: false,
  depthStabilization: false,
  batteryPercentage: 0,
});

export { rovStatusStore, type RovStatus };
