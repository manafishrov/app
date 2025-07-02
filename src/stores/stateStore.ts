import { Store } from '@tanstack/react-store';

type States = {
  pitchStabilization: boolean;
  rollStabilization: boolean;
  depthStabilization: boolean;
  recordingStartTime: number | null;
};

const stateStore = new Store<States>({
  pitchStabilization: false,
  rollStabilization: false,
  depthStabilization: false,
  recordingStartTime: null,
});

export { stateStore, type States };
