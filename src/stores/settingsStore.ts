import { Store } from '@tanstack/react-store';

type Settings = {
  pitchStabilization: boolean;
  rollStabilization: boolean;
  depthStabilization: boolean;
};

const settingsStore = new Store<Settings>({
  pitchStabilization: false,
  rollStabilization: false,
  depthStabilization: false,
});

export { settingsStore, type Settings };
