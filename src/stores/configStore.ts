import { Store } from '@tanstack/react-store';
import { invoke } from '@tauri-apps/api/core';

import { toast } from '@/components/ui/Toaster';

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
};

type ControlSource = 'LeftStick' | 'RightStick' | 'DPad' | 'FaceButtons';

type GamepadBindings = {
  moveHorizontal: ControlSource;
  moveUp: string;
  moveDown: string;
  pitchYaw: ControlSource;
  rollLeft: string;
  rollRight: string;
};

type Config = {
  ipAddress: string;
  cameraStreamPort: number;
  webSocketPort: number;
  keyboard: KeyboardBindings;
  gamepad: GamepadBindings;
};

const configStore = new Store<Config | null>(null);

async function loadConfig() {
  try {
    const config = await invoke<Config>('get_config');
    configStore.setState(() => config);
  } catch (error) {
    console.error('Failed to load config:', error);
    toast.error('Failed to load config');
  }
}

async function updateConnectionSettings(
  ipAddress: string,
  cameraStreamPort: number,
  webSocketPort: number,
) {
  const currentConfig = configStore.state;
  if (!currentConfig) return;

  const newConfig = {
    ...currentConfig,
    ipAddress,
    cameraStreamPort,
    webSocketPort,
  };

  await invoke('save_config', { config: newConfig });
  configStore.setState(() => newConfig);
}

async function updateKeyboardBindings(bindings: KeyboardBindings) {
  const currentConfig = configStore.state;
  if (!currentConfig) return;

  const newConfig = {
    ...currentConfig,
    keyboard: bindings,
  };

  await invoke('save_config', { config: newConfig });
  configStore.setState(() => newConfig);
}

async function updateGamepadBindings(bindings: GamepadBindings) {
  const currentConfig = configStore.state;
  if (!currentConfig) return;

  const newConfig = {
    ...currentConfig,
    gamepad: bindings,
  };

  await invoke('save_config', { config: newConfig });
  configStore.setState(() => newConfig);
}

export {
  configStore,
  loadConfig,
  updateConnectionSettings,
  updateKeyboardBindings,
  updateGamepadBindings,
  type KeyboardBindings,
  type ControlSource,
  type GamepadBindings,
  type Config,
};
