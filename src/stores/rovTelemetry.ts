import { createStore, reconcile } from 'solid-js/store';

type RovTelemetry = {
  pitch: number;
  roll: number;
  yaw: number;
  depth: number;
  desiredPitch: number;
  desiredRoll: number;
  desiredYaw: number;
  desiredDepth: number;
  waterTemperature: number;
  electronicsTemperature: number;
  thrusterRpms: [number, number, number, number, number, number, number, number];
  workIndicatorPercentage: number;
};

const [rovTelemetryStore, setRovTelemetryStoreInternal] = createStore<RovTelemetry>({
  pitch: 0,
  roll: 0,
  yaw: 0,
  depth: 0,
  desiredPitch: 0,
  desiredRoll: 0,
  desiredYaw: 0,
  desiredDepth: 0,
  waterTemperature: 0,
  electronicsTemperature: 0,
  thrusterRpms: [0, 0, 0, 0, 0, 0, 0, 0],
  workIndicatorPercentage: 0,
});

const setRovTelemetryStore = (value: RovTelemetry) => {
  setRovTelemetryStoreInternal(reconcile(value));
};

export { rovTelemetryStore, setRovTelemetryStore, type RovTelemetry };
