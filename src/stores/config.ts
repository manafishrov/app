import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

type KeyboardBindings = {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  moveUp: string;
  moveDown: string;
  pitchUp: string;
  pitchDown: string;
  yawLeft: string;
  yawRight: string;
  rollLeft: string;
  rollRight: string;
  action1: string;
  action2: string;
  stabilizePitch: string;
  stabilizeRoll: string;
  stabilizeDepth: string;
  record: string;
};

type ControlSource = 'leftStick' | 'rightStick' | 'dPad' | 'faceButtons';
type AttitudeIndicator = 'scientific' | 'dimensional3D' | 'disabled';

type GamepadBindings = {
  moveHorizontal: ControlSource;
  moveUp: string;
  moveDown: string;
  pitchYaw: ControlSource;
  rollLeft: string;
  rollRight: string;
  action1: string;
  action2: string;
  stabilizePitch: string;
  stabilizeRoll: string;
  stabilizeDepth: string;
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
