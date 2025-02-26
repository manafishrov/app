import { invoke } from '@tauri-apps/api/core';
import { create } from 'zustand';

type KeyboardBindings = {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  moveUp: string;
  moveDown: string;
  rotateLeft: string;
  rotateRight: string;
  tiltUp: string;
  tiltDown: string;
  tiltDiagonalLeft: string;
  tiltDiagonalRight: string;
};

type ControllerBindings = {
  leftStick: {
    xAxis: number;
    yAxis: number;
  };
  rightStick: {
    xAxis: number;
    yAxis: number;
  };
  buttons: {
    moveUp: number;
    moveDown: number;
    rotateLeft: number;
    rotateRight: number;
  };
};

type Config = {
  ip: string;
  streamPort: number;
  controlPort: number;
  keyboard: KeyboardBindings;
  controller: ControllerBindings;
};

type ConfigStore = {
  config: Config | null;
  loadConfig: () => Promise<void>;
  updateServerSettings: (ip: string, port: number) => Promise<void>;
  updateKeyboardBindings: (bindings: KeyboardBindings) => Promise<void>;
  updateControllerBindings: (bindings: ControllerBindings) => Promise<void>;
};

const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  loadConfig: async () => {
    const config = await invoke<Config>('get_config');
    set({ config });
  },
  updateServerSettings: async (ip: string, port: number) => {
    set((state) => {
      if (!state.config) return state;
      const newConfig = {
        ...state.config,
        ip,
        port,
      };
      void invoke('save_config', { newConfig });
      return { config: newConfig };
    });
  },
  updateKeyboardBindings: async (bindings: KeyboardBindings) => {
    set((state) => {
      if (!state.config) return state;
      const newConfig = {
        ...state.config,
        keyboard: bindings,
      };
      void invoke('save_config', { newConfig });
      return { config: newConfig };
    });
  },
  updateControllerBindings: async (bindings: ControllerBindings) => {
    set((state) => {
      if (!state.config) return state;
      const newConfig = {
        ...state.config,
        controller: bindings,
      };
      void invoke('save_config', { newConfig });
      return { config: newConfig };
    });
  },
}));

export {
  useConfigStore,
  type Config,
  type KeyboardBindings,
  type ControllerBindings,
};
