import { Store } from '@tanstack/react-store';

type States = {
  pitchStabilization: boolean;
  rollStabilization: boolean;
  depthStabilization: boolean;
};

const stateStore = new Store<States>({
  pitchStabilization: false,
  rollStabilization: false,
  depthStabilization: false,
});

export { stateStore, type States };
