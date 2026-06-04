import { createStore, reconcile } from 'solid-js/store';

import * as m from '@/paraglide/messages';

const McuBoard = {
  pico: 'pico',
  pico2: 'pico2',
} as const;

type McuBoard = (typeof McuBoard)[keyof typeof McuBoard];

const ThrusterProtocol = {
  pwm: 'pwm',
  dshot: 'dshot',
} as const;

type ThrusterProtocol = (typeof ThrusterProtocol)[keyof typeof ThrusterProtocol];

/* oxlint-disable no-magic-numbers */
const DshotSpeed = {
  dshot150: 150,
  dshot300: 300,
  dshot600: 600,
  dshot1200: 1200,
} as const;

type DshotSpeed = (typeof DshotSpeed)[keyof typeof DshotSpeed];
/* oxlint-enable no-magic-numbers */

const CurrentSensingMode = {
  perMotor: 'perMotor',
  sharedBus: 'sharedBus',
} as const;

type CurrentSensingMode = (typeof CurrentSensingMode)[keyof typeof CurrentSensingMode];

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

type NullspaceVectors = Row[];

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
  internalResistance: number;
};

type RovConfig = {
  firmwareVersion: string;
  mcuFirmwareVersion: string;
  rovName: string;
  mcuBoard: McuBoard;
  thrusterProtocol: ThrusterProtocol;
  dshotSpeed: DshotSpeed;
  currentSensingMode: CurrentSensingMode;
  fluidType: FluidType;
  smoothingFactor: number;
  thrusterPinSetup: ThrusterPinSetup;
  thrusterAllocation: ThrusterAllocation;
  nullspaceVectors: NullspaceVectors | null;
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
const createDefaultPitchRollYawAxisConfig = (): AxisConfig => ({
  kp: 1,
  ki: 0.5,
  kd: 0.1,
  rate: 120,
});
const createDefaultDepthAxisConfig = (): AxisConfig => ({ kp: 0.6, ki: 0, kd: 0.1, rate: 0.5 });

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
  mcuFirmwareVersion: m.common_not_available(),
  rovName: 'Manafish Nomad',
  mcuBoard: McuBoard.pico,
  thrusterProtocol: ThrusterProtocol.dshot,
  dshotSpeed: DshotSpeed.dshot300,
  currentSensingMode: CurrentSensingMode.sharedBus,
  fluidType: FluidType.saltwater,
  smoothingFactor: 0,
  thrusterPinSetup: {
    identifiers: [0, 1, 2, 3, 4, 5, 6, 7],
    spinDirections: [1, 1, 1, 1, 1, 1, 1, 1],
  },
  thrusterAllocation: defaultThrusterAllocation,
  nullspaceVectors: null,
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
    actionsLimit: 50,
    regulatorLimit: 30,
    minBatteryVoltage: 16,
    maxBatteryVoltage: 20.5,
    internalResistance: 0.1,
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
  CurrentSensingMode,
  DshotSpeed,
  McuBoard,
  ThrusterProtocol,
  defaultRovConfig,
  type AxisConfig,
  type Regulator,
  type DirectionCoefficients,
  type RovConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type NullspaceVectors,
  type Power,
  type RegulatorSuggestions,
  type Row,
};
