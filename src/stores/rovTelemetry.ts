import { Store } from '@tanstack/react-store';

type RovTelemetry = {
  pitch: number;
  roll: number;
  desiredPitch: number;
  desiredRoll: number;
  depth: number;
  temperature: number;
  thrusterRpms: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
};

const rovTelemetryStore = new Store<RovTelemetry>({
  pitch: 0,
  roll: 0,
  desiredPitch: 0,
  desiredRoll: 0,
  depth: 0,
  temperature: 0,
  thrusterRpms: [0, 0, 0, 0, 0, 0, 0, 0],
});

export { rovTelemetryStore, type RovTelemetry };
