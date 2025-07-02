import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { logError } from '@/lib/log';

type Row = [number, number, number, number, number, number, number, number];

type ThrusterPinSetup = {
  identifiers: Row;
  spinDirections: Row;
};

type ThrusterAllocation = [Row, Row, Row, Row, Row, Row, Row, Row];

type Regulator = {
  speedCoefficient: number;
  kp: number;
  ki: number;
  kd: number;
};

type DroneConfig = {
  thrusterPinSetup?: ThrusterPinSetup;
  thrusterAllocation?: ThrusterAllocation;
  regulator?: Regulator;
};

const droneConfigStore = new Store<DroneConfig>({});

async function requestThrusterConfig() {
  try {
    await invoke('get_thruster_config');
  } catch (error) {
    logError('Failed to request thruster config:', error);
  }
}

async function requestRegulatorConfig() {
  try {
    await invoke('get_regulator_config');
  } catch (error) {
    logError('Failed to request regulator config:', error);
  }
}

export {
  droneConfigStore,
  requestThrusterConfig,
  requestRegulatorConfig,
  type Regulator,
  type DroneConfig,
  type ThrusterPinSetup,
  type ThrusterAllocation,
  type Row,
};
