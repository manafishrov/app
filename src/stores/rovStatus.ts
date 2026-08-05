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

type RovStatus = {
  autoStabilization: boolean;
  depthHold: boolean;
  batteryPercentage: number;
  currentDraw: number;
  piUndervoltage: boolean;
  health: SystemHealth;
  deviceInfo?: DeviceInfo;
};

type RovStatusState = Omit<RovStatus, 'deviceInfo'> & {
  deviceInfo: DeviceInfo;
  deviceInfoAvailable: boolean;
};

const defaultDeviceInfo: DeviceInfo = {
  mcuFirmwareVersion: '',
  escFirmwareVersions: [null, null, null, null, null, null, null, null],
};

const [rovStatusStore, setRovStatusStoreInternal] = createStore<RovStatusState>({
  autoStabilization: false,
  depthHold: false,
  batteryPercentage: 0,
  currentDraw: 0,
  piUndervoltage: false,
  deviceInfo: defaultDeviceInfo,
  deviceInfoAvailable: false,
  health: {
    imuHealthy: false,
    pressureSensorHealthy: false,
    mcuHealthy: false,
  },
});

const setRovStatusStore = (value: RovStatus): void => {
  const deviceInfoAvailable = Boolean(value.deviceInfo);
  setRovStatusStoreInternal(
    reconcile({
      ...value,
      deviceInfo: value.deviceInfo ?? defaultDeviceInfo,
      deviceInfoAvailable,
    }),
  );
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
  type RovStatus,
  type SystemHealth,
};
