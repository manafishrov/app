import { createStore, reconcile } from 'solid-js/store';

import type { EscFirmwareVersions } from '@/stores/rovStatus';

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

const H264Profile = {
  baseline: 'baseline',
  main: 'main',
  high: 'high',
} as const;

type H264Profile = (typeof H264Profile)[keyof typeof H264Profile];

const H264Level = {
  level4: '4',
  level41: '4.1',
  level42: '4.2',
} as const;

type H264Level = (typeof H264Level)[keyof typeof H264Level];

const AwbMode = {
  auto: 'auto',
  incandescent: 'incandescent',
  tungsten: 'tungsten',
  fluorescent: 'fluorescent',
  indoor: 'indoor',
  daylight: 'daylight',
  cloudy: 'cloudy',
} as const;

type AwbMode = (typeof AwbMode)[keyof typeof AwbMode];

const DenoiseMode = {
  auto: 'auto',
  off: 'off',
  cdnOff: 'cdn_off',
  cdnFast: 'cdn_fast',
  cdnHq: 'cdn_hq',
} as const;

type DenoiseMode = (typeof DenoiseMode)[keyof typeof DenoiseMode];

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
};

type Camera = {
  width: number;
  height: number;
  framerate: number;
  cropFov: boolean;
  bitrate: number;
  keyframeInterval: number;
  profile: H264Profile;
  level: H264Level;
  rotation: number;
  hflip: boolean;
  vflip: boolean;
  awb: AwbMode;
  exposureValue: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  denoise: DenoiseMode;
};

type RovConfig = {
  firmwareVersion: string;
  // Compatibility fields supplied by older Pi firmware.
  mcuFirmwareVersion?: string;
  escFirmwareVersions?: EscFirmwareVersions;
  rovName: string;
  mcuBoard: McuBoard;
  thrusterProtocol: ThrusterProtocol;
  dshotSpeed: DshotSpeed;
  currentSensingMode: CurrentSensingMode;
  fluidType: FluidType;
  smoothingFactor: number;
  thrusterPinSetup: ThrusterPinSetup;
  thrusterAllocation: ThrusterAllocation;
  nullspaceVectors: NullspaceVectors;
  regulator: Regulator;
  directionCoefficients: DirectionCoefficients;
  power: Power;
  camera: Camera;
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
  kp: 6,
  ki: 2,
  kd: 0.6,
  rate: 120,
});
const createDefaultDepthAxisConfig = (): AxisConfig => ({ kp: 2, ki: 0, kd: 0.5, rate: 0.5 });

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
  escFirmwareVersions: [null, null, null, null, null, null, null, null],
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
  nullspaceVectors: [],
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
  },
  camera: {
    // Highest supported preset (see camera/constants.ts RESOLUTION_OPTIONS) at the full-FOV framerate ceiling for that resolution.
    width: 1440,
    height: 1080,
    framerate: 40,
    cropFov: false,
    // Width * height * framerate * 0.15 bits-per-pixel - the same formula camera/constants.ts uses to auto-tune the bitrate live.
    bitrate: 9_331_200,
    keyframeInterval: 30,
    profile: H264Profile.baseline,
    level: H264Level.level42,
    rotation: 0,
    hflip: false,
    vflip: false,
    awb: AwbMode.auto,
    exposureValue: 0,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    sharpness: 1,
    denoise: DenoiseMode.off,
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
  H264Profile,
  H264Level,
  AwbMode,
  DenoiseMode,
  defaultRovConfig,
  type AxisConfig,
  type Regulator,
  type DirectionCoefficients,
  type RovConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type NullspaceVectors,
  type Power,
  type Camera,
  type RegulatorSuggestions,
  type Row,
};
