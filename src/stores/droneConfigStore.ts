import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

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

type MovementCoefficients = {
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

type DroneConfig = {
  fluidType: 'saltwater' | 'freshwater';
  thrusterPinSetup: ThrusterPinSetup;
  thrusterAllocation: ThrusterAllocation;
  regulator: Regulator;
  movementCoefficients: MovementCoefficients;
  power: Power;
};

const droneConfigStore = new Store<DroneConfig | null>(null);

async function requestDroneConfig() {
  try {
    await invoke('request_drone_config');
  } catch (error) {
    logError('Failed to request drone config:', error);
    toast.error('Failed to request drone config');
  }
}

async function setDroneConfig(newConfigOptions: Partial<DroneConfig>) {
  const currentDroneConfig = droneConfigStore.state;
  if (!currentDroneConfig) {
    logError('Current drone config is null');
    toast.error('Current drone config is null');
    return;
  }

  const newDroneConfig = {
    ...currentDroneConfig,
    ...newConfigOptions,
  };
  try {
    await invoke('set_drone_config', { droneConfig: newDroneConfig });
    droneConfigStore.setState(() => newDroneConfig);
    toast.success('Drone config set successfully');
  } catch (error) {
    logError('Failed to set drone config:', error);
    toast.error('Failed to set drone config');
  }
}

export {
  droneConfigStore,
  requestDroneConfig,
  setDroneConfig,
  type Regulator,
  type MovementCoefficients,
  type DroneConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Row,
  type Power,
};
