import { createStore, reconcile } from 'solid-js/store';

type SystemHealth = {
  imuHealthy: boolean;
  pressureSensorHealthy: boolean;
  mcuHealthy: boolean;
};

type EscFirmwareVersions = [
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
  string | null,
];

type DeviceInfo = {
  mcuFirmwareVersion: string;
  escFirmwareVersions: EscFirmwareVersions;
};

type EscFirmwareUpdate = {
  active: boolean;
  origin: 'automatic' | 'manual' | null;
  stage:
    | 'idle'
    | 'preflight'
    | 'uploading'
    | 'programming'
    | 'awaitingTelemetry'
    | 'succeeded'
    | 'failed';
  progress: number;
  currentEsc: number | null;
  targetVersion: string | null;
  error: string | null;
};

type RovStatus = {
  autoStabilization: boolean;
  depthHold: boolean;
  batteryPercentage: number;
  currentDraw: number;
  piUndervoltage: boolean;
  thrusterControlReady: boolean;
  health: SystemHealth;
  deviceInfo: DeviceInfo;
  escFirmwareUpdate: EscFirmwareUpdate;
};

const defaultDeviceInfo: DeviceInfo = {
  mcuFirmwareVersion: '',
  escFirmwareVersions: [null, null, null, null, null, null, null, null],
};

const defaultEscFirmwareUpdate: EscFirmwareUpdate = {
  active: false,
  origin: null,
  stage: 'idle',
  progress: 0,
  currentEsc: null,
  targetVersion: null,
  error: null,
};

const [rovStatusStore, setRovStatusStoreInternal] = createStore<RovStatus>({
  autoStabilization: false,
  depthHold: false,
  batteryPercentage: 0,
  currentDraw: 0,
  piUndervoltage: false,
  thrusterControlReady: false,
  deviceInfo: defaultDeviceInfo,
  escFirmwareUpdate: defaultEscFirmwareUpdate,
  health: {
    imuHealthy: false,
    pressureSensorHealthy: false,
    mcuHealthy: false,
  },
});

const setRovStatusStore = (value: RovStatus): void => {
  setRovStatusStoreInternal(reconcile(value));
};

const setAutoStabilizationOptimistic = (value: boolean): void => {
  setRovStatusStoreInternal('autoStabilization', value);
};

const setDepthHoldOptimistic = (value: boolean): void => {
  setRovStatusStoreInternal('depthHold', value);
};

export {
  rovStatusStore,
  setAutoStabilizationOptimistic,
  setDepthHoldOptimistic,
  setRovStatusStore,
  type DeviceInfo,
  type EscFirmwareVersions,
  type EscFirmwareUpdate,
  type RovStatus,
  type SystemHealth,
};
