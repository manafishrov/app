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

async function loadConfig() {
  try {
    const config = await invoke<Config>('get_config');
    configStore.setState(() => config);
  } catch (error) {
    logError('Failed to load config:', error);
    toast.error('Failed to load config');
  }
}

async function updateConfig(settings: Partial<Config>) {
  const currentConfig = configStore.state;
  if (!currentConfig) return;

  const newConfig = {
    ...currentConfig,
    ...settings,
  };

  try {
    await invoke('save_config', { config: newConfig });
    configStore.setState(() => newConfig);
    toast.success('Configuration updated successfully');
  } catch (error) {
    logError('Failed to update config:', error);
    toast.error('Failed to update configuration');
  }
}

export {
  configStore,
  loadConfig,
  updateConfig,
  type KeyboardBindings,
  type ControlSource,
  type GamepadBindings,
  type Config,
  type AttitudeIndicator,
};
