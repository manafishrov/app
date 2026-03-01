import { invoke } from '@tauri-apps/api/core';
import { createStore, reconcile } from 'solid-js/store';

import { toast } from '@/components/ui/Toaster';
import { logError } from '@/lib/log';
import { connectionStatusStore } from '@/stores/connectionStatus';

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
  userMaxPower: number;
  regulatorMaxPower: number;
  batteryMinVoltage: number;
  batteryMaxVoltage: number;
};

type RovConfig = {
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

const defaultAxisConfig: AxisConfig = { kp: 0, ki: 0, kd: 0, rate: 0 };
const defaultRow: [number, number, number, number, number, number, number, number] = [
  0, 0, 0, 0, 0, 0, 0, 0,
];

const defaultRovConfig: RovConfig = {
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
    userMaxPower: 0,
    regulatorMaxPower: 0,
    batteryMinVoltage: 0,
    batteryMaxVoltage: 0,
  },
};

const [rovConfigStore, setRovConfigStoreInternal] = createStore<RovConfig>(defaultRovConfig);

const setRovConfigStore = (value: RovConfig) => {
  setRovConfigStoreInternal(reconcile(value));
};

const requestRovConfig = async () => {
  if (!connectionStatusStore.isConnected) return;

  await invoke('request_rov_config').catch((error) => {
    logError('Failed to request ROV config:', error);
    toast.error('Failed to request ROV config');
  });
};

const setRovConfig = async (newConfigOptions: Partial<RovConfig>) => {
  const currentRovConfig = { ...rovConfigStore };
  const newRovConfig = { ...currentRovConfig, ...newConfigOptions };

  setRovConfigStore(newRovConfig);

  await invoke('set_rov_config', { payload: newRovConfig }).catch((error) => {
    setRovConfigStore(currentRovConfig);
    logError('Failed to set ROV config:', error);
    toast.error('Failed to set ROV config. Changes reverted.');
  });
};

export {
  rovConfigStore,
  setRovConfigStore,
  requestRovConfig,
  setRovConfig,
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
};
