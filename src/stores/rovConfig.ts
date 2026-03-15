import { createStore, reconcile } from 'solid-js/store';

import * as m from '@/paraglide/messages';

type MicrocontrollerFirmwareVariant = 'pwm' | 'dshot';

const MicrocontrollerFirmwareVariant = {
  pwm: 'pwm',
  dshot: 'dshot',
} as const;

type FluidType = 'saltwater' | 'freshwater';

const FluidType = {
  saltwater: 'saltwater',
  freshwater: 'freshwater',
} as const;

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
  microcontrollerFirmwareVariant: MicrocontrollerFirmwareVariant;
  fluidType: FluidType;
  smoothingFactor: number;
  thrusterPinSetup: ThrusterPinSetup;
  thrusterAllocation: ThrusterAllocation;
  regulator: Regulator;
  directionCoefficients: DirectionCoefficients;
  power: Power;
};

type RegulatorSuggestions = {
  pitch: AxisConfig;
  roll: AxisConfig;
  yaw: AxisConfig;
  depth: AxisConfig;
};

const defaultAxisConfig: AxisConfig = { kp: 0, ki: 0, kd: 0, rate: 5 };
const defaultRow: [number, number, number, number, number, number, number, number] = [
  0, 0, 0, 0, 0, 0, 0, 0,
];

const defaultRovConfig: RovConfig = {
  firmwareVersion: m.common_not_available(),
  microcontrollerFirmwareVariant: 'pwm',
  fluidType: 'freshwater',
  smoothingFactor: 0,
  thrusterPinSetup: {
    identifiers: [0, 0, 0, 0, 0, 0, 0, 0],
    spinDirections: [0, 0, 0, 0, 0, 0, 0, 0],
  },
  thrusterAllocation: [
    defaultRow,
    defaultRow,
    defaultRow,
    defaultRow,
    defaultRow,
    defaultRow,
    defaultRow,
    defaultRow,
  ],
  regulator: {
    pitch: defaultAxisConfig,
    roll: defaultAxisConfig,
    yaw: defaultAxisConfig,
    depth: defaultAxisConfig,
    fpvMode: false,
  },
  directionCoefficients: { surge: 0, sway: 0, heave: 0 },
  power: {
    thrustersLimit: 0,
    actionsLimit: 0,
    regulatorLimit: 0,
    minBatteryVoltage: 0,
    maxBatteryVoltage: 0,
  },
};

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
