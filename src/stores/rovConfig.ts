import { createStore, reconcile } from 'solid-js/store';

import * as m from '@/paraglide/messages';

const MicrocontrollerFirmwareVariant = {
  pwm: 'pwm',
  dshot: 'dshot',
} as const;

type MicrocontrollerFirmwareVariant =
  (typeof MicrocontrollerFirmwareVariant)[keyof typeof MicrocontrollerFirmwareVariant];

const FluidType = {
  saltwater: 'saltwater',
  freshwater: 'freshwater',
} as const;

type FluidType = (typeof FluidType)[keyof typeof FluidType];

type ThrusterPinSetup = {
  identifiers: [number, number, number, number, number, number, number, number];
  spinDirections: [number, number, number, number, number, number, number, number];
};

type ThrusterAllocation = [
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
  [number, number, number, number, number, number, number, number],
];

type Row = [number, number, number, number, number, number, number, number];

type AxisConfig = {
  kp: number;
  ki: number;
  kd: number;
  rate: number;
};

type Regulator = {
  pitch: AxisConfig;
  roll: AxisConfig;
  yaw: AxisConfig;
  depth: AxisConfig;
  fpvMode: boolean;
};

type DirectionCoefficients = {
  surge: number;
  sway: number;
  heave: number;
};

type Power = {
  thrustersLimit: number;
  actionsLimit: number;
  regulatorLimit: number;
  minBatteryVoltage: number;
  maxBatteryVoltage: number;
};

type RovConfig = {
  firmwareVersion: string;
  rovName: string;
  microcontrollerFirmwareVariant: MicrocontrollerFirmwareVariant;
  fluidType: FluidType;
  smoothingFactor: number;
  thrusterPinSetup: ThrusterPinSetup;
  thrusterAllocation: ThrusterAllocation;
  regulator: Regulator;
  directionCoefficients: DirectionCoefficients;
  power: Power;
  ipAddress: string;
  websocketPort: number;
};

type RegulatorSuggestions = {
  pitch: AxisConfig;
  roll: AxisConfig;
  yaw: AxisConfig;
  depth: AxisConfig;
};

/* oxlint-disable no-magic-numbers */
const createDefaultPitchRollYawAxisConfig = (): AxisConfig => ({ kp: 3, ki: 2, kd: 0.5, rate: 100 });
const createDefaultDepthAxisConfig = (): AxisConfig => ({ kp: 2, ki: 0.5, kd: 0.1, rate: 0.5 });

const defaultThrusterAllocation: ThrusterAllocation = [
  [1, 1, 0, 0, -1, 0, 0, 0],
  [1, -1, 0, 0, 1, 0, 0, 0],
  [0, 0, 1, 1, 0, 1, 0, 0],
  [0, 0, 1, 1, 0, -1, 0, 0],
  [0, 0, 1, -1, 0, 1, 0, 0],
  [0, 0, 1, -1, 0, -1, 0, 0],
  [-1, -1, 0, 0, 1, 0, 0, 0],
  [-1, 1, 0, 0, -1, 0, 0, 0],
];

const defaultRovConfig: RovConfig = {
  firmwareVersion: m.common_not_available(),
  rovName: 'Manafish Nomad',
  microcontrollerFirmwareVariant: MicrocontrollerFirmwareVariant.dshot,
  fluidType: FluidType.saltwater,
  smoothingFactor: 0,
  thrusterPinSetup: {
    identifiers: [0, 1, 2, 3, 4, 5, 6, 7],
    spinDirections: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  thrusterAllocation: defaultThrusterAllocation,
  regulator: {
    pitch: createDefaultPitchRollYawAxisConfig(),
    roll: createDefaultPitchRollYawAxisConfig(),
    yaw: createDefaultPitchRollYawAxisConfig(),
    depth: createDefaultDepthAxisConfig(),
    fpvMode: false,
  },
  directionCoefficients: { surge: 1, sway: 1, heave: 1 },
  power: {
    thrustersLimit: 30,
    actionsLimit: 30,
    regulatorLimit: 30,
    minBatteryVoltage: 14,
    maxBatteryVoltage: 21.5,
  },
  ipAddress: '10.10.10.10',
  websocketPort: 9000,
};
/* oxlint-enable no-magic-numbers */

const [rovConfigStore, setRovConfigStoreInternal] = createStore<RovConfig>(defaultRovConfig);

const setRovConfigStore = (value: RovConfig): void => {
  setRovConfigStoreInternal(reconcile(value));
};

export {
  rovConfigStore,
  setRovConfigStore,
  FluidType,
  MicrocontrollerFirmwareVariant,
  defaultRovConfig,
  type AxisConfig,
  type Regulator,
  type DirectionCoefficients,
  type RovConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Power,
  type RegulatorSuggestions,
  type Row,
};
