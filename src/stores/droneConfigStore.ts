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

type DroneConfig = {
  thrusterPinSetup?: ThrusterPinSetup;
  thrusterAllocation?: ThrusterAllocation;
  regulator?: Regulator;
  movementCoefficients?: MovementCoefficients;
};

const droneConfigStore = new Store<DroneConfig>({});

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

export {
  droneConfigStore,
  requestThrusterConfig,
  requestRegulatorConfig,
  thrusterAllocationUpdate,
  movementCoefficientsUpdate,
  regulatorUpdate,
  type Regulator,
  type MovementCoefficients,
  type DroneConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Row,
};
