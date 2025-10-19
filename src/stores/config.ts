import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

type KeyboardBindings = {
  surgeForward: string;
  surgeBackward: string;
  swayLeft: string;
  swayRight: string;
  heaveUp: string;
  heaveDown: string;
  pitchUp: string;
  pitchDown: string;
  yawLeft: string;
  yawRight: string;
  rollLeft: string;
  rollRight: string;
  action1Positive: string;
  action1Negative: string;
  action2Positive: string;
  action2Negative: string;
  pitchStabilization: string;
  rollStabilization: string;
  depthHold: string;
  record: string;
};

type ControlSource = 'leftStick' | 'rightStick' | 'dPad' | 'faceButtons';
type AttitudeIndicator = 'scientific' | 'dimensional3D' | 'disabled';

type GamepadBindings = {
  surgeSway: ControlSource;
  heaveUp: string;
  heaveDown: string;
  pitchYaw: ControlSource;
  rollLeft: string;
  rollRight: string;
  action1Positive: string;
  action1Negative: string;
  action2Positive: string;
  action2Negative: string;
  pitchStabilization: string;
  rollStabilization: string;
  depthHold: string;
  record: string;
};

type Config = {
  autoUpdate: boolean;
  attitudeIndicator: AttitudeIndicator;
  thrusterRpmOverlay: boolean;
  videoDirectory: string;
  ipAddress: string;
  webrtcSignalingApiPort: number;
  webrtcSignalingApiPath: string;
  webSocketPort: number;
  infoLogging: boolean;
  keyboard: KeyboardBindings;
  gamepad: GamepadBindings;
};

const configStore = new Store<Config | null>(null);

async function getConfig() {
  try {
    const payload = await invoke<Config>('get_config');
    configStore.setState(() => payload);
  } catch (error) {
    logError('Failed to get config:', error);
    toast.error('Failed to get config');
  }
}

async function setConfig(newConfigOptions: Partial<Config>) {
  const currentConfig = configStore.state;
  if (!currentConfig) {
    logError('Current config is null');
    toast.error('Current config is null');
    return;
  }

  const newConfig = {
    ...currentConfig,
    ...newConfigOptions,
  };

  configStore.setState(() => newConfig);

  try {
    await invoke('set_config', { payload: newConfig });
  } catch (error) {
    configStore.setState(() => currentConfig);
    logError('Failed to set config:', error);
    toast.error('Failed to set config. Changes reverted.');
  }
}

export {
  configStore,
  getConfig,
  setConfig,
  type KeyboardBindings,
  type ControlSource,
  type GamepadBindings,
  type Config,
  type AttitudeIndicator,
};
