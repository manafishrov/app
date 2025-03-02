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

type GamepadBindings = {
  moveHorizontal: string;
  moveUp: string;
  moveDown: string;
  pitchYaw: string;
  rollLeft: string;
  rollRight: string;
};

type Config = {
  ip: string;
  streamPort: number;
  controlPort: number;
  keyboard: KeyboardBindings;
  gamepad: GamepadBindings;
};

type ConfigStore = {
  config: Config | null;
  loadConfig: () => Promise<void>;
  updateServerSettings: (
    ip: string,
    streamPort: number,
    controlPort: number,
  ) => Promise<void>;
  updateKeyboardBindings: (bindings: KeyboardBindings) => Promise<void>;
  updateControllerBindings: (bindings: GamepadBindings) => Promise<void>;
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
    ip: string,
    streamPort: number,
    controlPort: number,
  ) => {
    set((state) => {
      if (!state.config) return state;
      const config = {
        ...state.config,
        ip,
        streamPort,
        controlPort,
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
  updateControllerBindings: async (bindings: GamepadBindings) => {
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
