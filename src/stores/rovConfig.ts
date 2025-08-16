import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

import { connectionStatusStore } from '@/stores/connectionStatus';

type Row = [number, number, number, number, number, number, number, number];

type ThrusterPinSetup = {
  identifiers: Row;
  spinDirections: Row;
};

type ThrusterAllocation = [Row, Row, Row, Row, Row, Row, Row, Row];

type pid = {
  kp: number;
  ki: number;
  kd: number;
};

type Regulator = {
  turnSpeed: number;
  pitch: pid;
  roll: pid;
  depth: pid;
};

type DirectionCoefficients = {
  horizontal: number;
  strafe: number;
  vertical: number;
  pitch: number;
  yaw: number;
  roll: number;
};

type Power = {
  userMaxPower: number;
  regulatorMaxPower: number;
  batteryMinVoltage: number;
  batteryMaxVoltage: number;
};

type RovConfig = {
  microcontrollerFirmwareVariant: 'pwm' | 'dshot300';
  fluidType: 'saltwater' | 'freshwater';
  thrusterPinSetup: ThrusterPinSetup;
  thrusterAllocation: ThrusterAllocation;
  regulator: Regulator;
  directionCoefficients: DirectionCoefficients;
  power: Power;
};

const rovConfigStore = new Store<RovConfig | null>(null);

async function requestRovConfig() {
  if (!connectionStatusStore.state.isConnected) return;

  try {
    await invoke('request_rov_config');
  } catch (error) {
    logError('Failed to request ROV config:', error);
    toast.error('Failed to request ROV config');
  }
}

async function setRovConfig(newConfigOptions: Partial<RovConfig>) {
  const currentRovConfig = rovConfigStore.state;
  if (!currentRovConfig) {
    logError('Current ROV config is null');
    toast.error('Current ROV config is null');
    return;
  }

  const newRovConfig = {
    ...currentRovConfig,
    ...newConfigOptions,
  };

  rovConfigStore.setState(() => newRovConfig);

  try {
    await invoke('set_rov_config', { payload: newRovConfig });
  } catch (error) {
    rovConfigStore.setState(() => currentRovConfig);
    logError('Failed to set ROV config:', error);
    toast.error('Failed to set ROV config. Changes reverted.');
  }
}

export {
  rovConfigStore,
  requestRovConfig,
  setRovConfig,
  type Regulator,
  type DirectionCoefficients,
  type RovConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Row,
  type Power,
};
