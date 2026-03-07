import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { createStore, reconcile } from 'solid-js/store';

import { logError } from '@/lib/log';

type KeyboardKey =
  | 'KeyA'
  | 'KeyB'
  | 'KeyC'
  | 'KeyD'
  | 'KeyE'
  | 'KeyF'
  | 'KeyG'
  | 'KeyH'
  | 'KeyI'
  | 'KeyJ'
  | 'KeyK'
  | 'KeyL'
  | 'KeyM'
  | 'KeyN'
  | 'KeyO'
  | 'KeyP'
  | 'KeyQ'
  | 'KeyR'
  | 'KeyS'
  | 'KeyT'
  | 'KeyU'
  | 'KeyV'
  | 'KeyW'
  | 'KeyX'
  | 'KeyY'
  | 'KeyZ'
  | 'Digit1'
  | 'Digit2'
  | 'Digit3'
  | 'Digit4'
  | 'Digit5'
  | 'Digit6'
  | 'Digit7'
  | 'Digit8'
  | 'Digit9'
  | 'Digit0'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'Enter'
  | 'Escape'
  | 'Backspace'
  | 'Tab'
  | 'Space'
  | 'Minus'
  | 'Equal'
  | 'BracketLeft'
  | 'BracketRight'
  | 'Backslash'
  | 'Semicolon'
  | 'Quote'
  | 'Backquote'
  | 'Comma'
  | 'Period'
  | 'Slash'
  | 'CapsLock'
  | 'ArrowRight'
  | 'ArrowLeft'
  | 'ArrowDown'
  | 'ArrowUp'
  | 'ControlLeft'
  | 'ShiftLeft'
  | 'AltLeft'
  | 'MetaLeft'
  | 'ControlRight'
  | 'ShiftRight'
  | 'AltRight'
  | 'MetaRight'
  | 'PrintScreen'
  | 'ScrollLock'
  | 'Pause'
  | 'Insert'
  | 'Home'
  | 'PageUp'
  | 'Delete'
  | 'End'
  | 'PageDown'
  | 'NumLock'
  | 'NumpadDivide'
  | 'NumpadMultiply'
  | 'NumpadSubtract'
  | 'NumpadAdd'
  | 'NumpadEnter'
  | 'Numpad1'
  | 'Numpad2'
  | 'Numpad3'
  | 'Numpad4'
  | 'Numpad5'
  | 'Numpad6'
  | 'Numpad7'
  | 'Numpad8'
  | 'Numpad9'
  | 'Numpad0'
  | 'NumpadDecimal';

type GamepadInputType = { Button: number } | { Axis: number };

type KeyboardInput = {
  key: KeyboardKey;
  minValue: number;
  maxValue: number;
};

type GamepadInput = {
  input: GamepadInputType;
  minValue: number;
  maxValue: number;
};

type NullableKeyboardInput = KeyboardInput | null;
type NullableGamepadInput = GamepadInput | null;

type KeyboardBindings = {
  surgeForward: NullableKeyboardInput;
  surgeBackward: NullableKeyboardInput;
  swayRight: NullableKeyboardInput;
  swayLeft: NullableKeyboardInput;
  heaveUp: NullableKeyboardInput;
  heaveDown: NullableKeyboardInput;
  pitchUp: NullableKeyboardInput;
  pitchDown: NullableKeyboardInput;
  yawRight: NullableKeyboardInput;
  yawLeft: NullableKeyboardInput;
  rollLeft: NullableKeyboardInput;
  rollRight: NullableKeyboardInput;
  action1Positive: NullableKeyboardInput;
  action1Negative: NullableKeyboardInput;
  action2Positive: NullableKeyboardInput;
  action2Negative: NullableKeyboardInput;
  autoStabilization: NullableKeyboardInput;
  depthHold: NullableKeyboardInput;
  record: NullableKeyboardInput;
};

type GamepadBindings = {
  surgeForward: NullableGamepadInput;
  surgeBackward: NullableGamepadInput;
  swayRight: NullableGamepadInput;
  swayLeft: NullableGamepadInput;
  heaveUp: NullableGamepadInput;
  heaveDown: NullableGamepadInput;
  pitchUp: NullableGamepadInput;
  pitchDown: NullableGamepadInput;
  yawRight: NullableGamepadInput;
  yawLeft: NullableGamepadInput;
  rollLeft: NullableGamepadInput;
  rollRight: NullableGamepadInput;
  action1Positive: NullableGamepadInput;
  action1Negative: NullableGamepadInput;
  action2Positive: NullableGamepadInput;
  action2Negative: NullableGamepadInput;
  autoStabilization: NullableGamepadInput;
  depthHold: NullableGamepadInput;
  record: NullableGamepadInput;
};

type AttitudeIndicator = 'scientific' | 'dimensional3D' | 'disabled';

const AttitudeIndicator = {
  scientific: 'scientific',
  dimensional3D: 'dimensional3D',
  disabled: 'disabled',
} as const;

type Config = {
  autoUpdate: boolean;
  attitudeIndicator: AttitudeIndicator;
  workIndicator: boolean;
  thrusterRpmOverlay: boolean;
  videoDirectory: string;
  ipAddress: string;
  webrtcSignalingApiPort: number;
  webrtcSignalingApiPath: string;
  webSocketPort: number;
  keyboard: KeyboardBindings;
  selectedGamepadId: string | null;
  gamepad: Record<string, GamepadBindings>;
};

const createNullKeyboardBindings = (): KeyboardBindings => ({
  surgeForward: null,
  surgeBackward: null,
  swayRight: null,
  swayLeft: null,
  heaveUp: null,
  heaveDown: null,
  pitchUp: null,
  pitchDown: null,
  yawRight: null,
  yawLeft: null,
  rollLeft: null,
  rollRight: null,
  action1Positive: null,
  action1Negative: null,
  action2Positive: null,
  action2Negative: null,
  autoStabilization: null,
  depthHold: null,
  record: null,
});

const createNullGamepadBindings = (): GamepadBindings => ({
  surgeForward: null,
  surgeBackward: null,
  swayRight: null,
  swayLeft: null,
  heaveUp: null,
  heaveDown: null,
  pitchUp: null,
  pitchDown: null,
  yawRight: null,
  yawLeft: null,
  rollLeft: null,
  rollRight: null,
  action1Positive: null,
  action1Negative: null,
  action2Positive: null,
  action2Negative: null,
  autoStabilization: null,
  depthHold: null,
  record: null,
});

const defaultConfig: Config = {
  autoUpdate: false,
  attitudeIndicator: 'scientific',
  workIndicator: false,
  thrusterRpmOverlay: false,
  videoDirectory: '~/Movies/Manafish',
  ipAddress: '10.10.10.10',
  webrtcSignalingApiPort: 1984,
  webrtcSignalingApiPath: '/api/webrtc?src=cam',
  webSocketPort: 9000,
  keyboard: createNullKeyboardBindings(),
  selectedGamepadId: null,
  gamepad: {},
};

const [configStore, setConfigStoreInternal] = createStore<Config>(defaultConfig);

const setConfigStore = (value: Config) => {
  setConfigStoreInternal(reconcile(value));
};

const getConfig = async () => {
  await invoke<Config>('get_config')
    .then((payload) => setConfigStore(payload))
    .catch((error) => {
      logError('Failed to get config:', error);
      toast.create({ title: 'Failed to get config', type: 'error' });
    });
};

const setConfig = async (newConfigOptions: Partial<Config>) => {
  const currentConfig = { ...configStore };
  const newConfig = { ...currentConfig, ...newConfigOptions };

  setConfigStore(newConfig);

  await invoke('set_config', { payload: newConfig }).catch((error) => {
    setConfigStore(currentConfig);
    logError('Failed to set config:', error);
    toast.create({ title: 'Failed to set config. Changes reverted.', type: 'error' });
  });
};

export {
  configStore,
  setConfigStore,
  getConfig,
  setConfig,
  AttitudeIndicator,
  defaultConfig,
  createNullKeyboardBindings,
  createNullGamepadBindings,
  type KeyboardKey,
  type GamepadInputType,
  type KeyboardInput,
  type GamepadInput,
  type KeyboardBindings,
  type GamepadBindings,
  type AttitudeIndicator as AttitudeIndicatorType,
  type Config,
};
