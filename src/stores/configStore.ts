import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

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

type ControlSource = 'leftStick' | 'rightStick' | 'dPad' | 'faceButtons';

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
  deviceControlsPort: number;
  keyboard: KeyboardBindings;
  gamepad: GamepadBindings;
};

type ConfigStore = {
  config: Config | null;
  loadConfig: () => Promise<void>;
  updateServerSettings: (
    ipAddress: string,
    cameraStreamPort: number,
    deviceControlsPort: number,
  ) => Promise<void>;
  updateKeyboardBindings: (bindings: KeyboardBindings) => Promise<void>;
  updateGamepadBindings: (bindings: GamepadBindings) => Promise<void>;
};

const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  loadConfig: async () => {
    try {
      const config = await invoke<Config>('get_config');
      set({ config });
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('Failed to load config');
    }
  },
  updateServerSettings: async (
    ipAddress: string,
    cameraStreamPort: number,
    deviceControlsPort: number,
  ) => {
    set((state) => {
      if (!state.config) return state;
      const config = {
        ...state.config,
        ipAddress,
        cameraStreamPort,
        deviceControlsPort,
      };
      void invoke('save_config', { config });
      return { config };
    });
  },
  updateKeyboardBindings: async (bindings: KeyboardBindings) => {
    set((state) => {
      if (!state.config) return state;
      const config = {
        ...state.config,
        keyboard: bindings,
      };
      void invoke('save_config', { config });
      return { config };
    });
  },
  updateGamepadBindings: async (bindings: GamepadBindings) => {
    set((state) => {
      if (!state.config) return state;
      const config = {
        ...state.config,
        gamepad: bindings,
      };
      void invoke('save_config', { config });
      return { config };
    });
  },
}));

export {
  useConfigStore,
  type Config,
  type KeyboardBindings,
  type GamepadBindings,
};
