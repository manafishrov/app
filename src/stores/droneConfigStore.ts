import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

type General = {
  fluidType: 'saltwater' | 'freshwater';
};

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
  pitch: pid;
  roll: pid;
  depth: pid;
  turnSpeed: number;
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
  thrusterPinSetup?: ThrusterPinSetup;
  thrusterAllocation?: ThrusterAllocation;
  regulator?: Regulator;
  movementCoefficients?: MovementCoefficients;
  power?: Power;
};

const droneConfigStore = new Store<DroneConfig>({});

async function requestFirmwareVersion() {
  try {
    await invoke('get_firmware_version');
  } catch (error) {
    logError('Failed to request firmware version:', error);
    toast.error('Failed to request firmware version');
  }
}

async function requestGeneralDroneConfig() {
  try {
    await invoke('get_general_drone_config');
  } catch (error) {
    logError('Failed to request general ROV config:', error);
    toast.error('Failed to request general ROV config');
  }
}

async function requestThrusterConfig() {
  try {
    await invoke('get_thruster_config');
  } catch (error) {
    logError('Failed to request thruster config:', error);
    toast.error('Failed to request thruster config');
  }
}

async function requestRegulatorConfig() {
  try {
    await invoke('get_regulator_config');
  } catch (error) {
    logError('Failed to request regulator config:', error);
    toast.error('Failed to request regulator config');
  }
}

async function requestPowerConfig() {
  try {
    await invoke('get_power_config');
  } catch (error) {
    logError('Failed to request power config:', error);
    toast.error('Failed to request power config');
  }
}

async function generalDroneConfigUpdate(general: General) {
  try {
    await invoke('general_drone_config', { payload: general });
  } catch (error) {
    logError('Failed to set general drone config:', error);
    toast.error('Failed to set general drone config');
  }
}

async function thrusterAllocationUpdate(
  thrusterAllocation: ThrusterAllocation,
) {
  try {
    await invoke('thruster_allocation', { payload: thrusterAllocation });
  } catch (error) {
    logError('Failed to set thruster allocation:', error);
    toast.error('Failed to set thruster allocation');
  }
}

async function regulatorUpdate(regulator: Regulator) {
  try {
    await invoke('regulator', { payload: regulator });
  } catch (error) {
    logError('Failed to set new regulator config:', error);
    toast.error('Failed to set new regulator config');
  }
}

async function movementCoefficientsUpdate(
  movementCoefficients: MovementCoefficients,
) {
  try {
    await invoke('movement_coefficients', { payload: movementCoefficients });
  } catch (error) {
    logError('Failed to set new movement coefficients config:', error);
    toast.error('Failed to set new movement coefficients config');
  }
}

async function powerUpdate(regulator: Regulator) {
  try {
    await invoke('regulator', { payload: regulator });
  } catch (error) {
    logError('Failed to set new regulator config:', error);
    toast.error('Failed to set new regulator config');
  }
}

export {
  droneConfigStore,
  requestFirmwareVersion,
  requestGeneralDroneConfig,
  requestThrusterConfig,
  requestRegulatorConfig,
  requestPowerConfig,
  generalDroneConfigUpdate,
  thrusterAllocationUpdate,
  regulatorUpdate,
  movementCoefficientsUpdate,
  powerUpdate,
  type Regulator,
  type MovementCoefficients,
  type DroneConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Row,
  type General,
  type Power,
};
