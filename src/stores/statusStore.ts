import { Store } from '@tanstack/react-store';

type Status = {
  pitch: number;
  roll: number;
  desiredPitch: number;
  desiredRoll: number;
  depth: number;
  temperature: number;
};

const statusStore = new Store<Status>({
  pitch: 0,
  roll: 0,
  desiredPitch: 0,
  desiredRoll: 0,
  depth: 0,
  temperature: 0,
});

export { statusStore, type Status };
