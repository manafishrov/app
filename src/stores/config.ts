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

type KeyboardBindings = {
  surgeForward: KeyboardInput;
  surgeBackward: KeyboardInput;
  swayRight: KeyboardInput;
  swayLeft: KeyboardInput;
  heaveUp: KeyboardInput;
  heaveDown: KeyboardInput;
  pitchUp: KeyboardInput;
  pitchDown: KeyboardInput;
  yawRight: KeyboardInput;
  yawLeft: KeyboardInput;
  rollLeft: KeyboardInput;
  rollRight: KeyboardInput;
  action1Positive: KeyboardInput;
  action1Negative: KeyboardInput;
  action2Positive: KeyboardInput;
  action2Negative: KeyboardInput;
  autoStabilization: KeyboardInput;
  depthHold: KeyboardInput;
  record: KeyboardInput;
};

type GamepadBindings = {
  surgeForward: GamepadInput;
  surgeBackward: GamepadInput;
  swayRight: GamepadInput;
  swayLeft: GamepadInput;
  heaveUp: GamepadInput;
  heaveDown: GamepadInput;
  pitchUp: GamepadInput;
  pitchDown: GamepadInput;
  yawRight: GamepadInput;
  yawLeft: GamepadInput;
  rollLeft: GamepadInput;
  rollRight: GamepadInput;
  action1Positive: GamepadInput;
  action1Negative: GamepadInput;
  action2Positive: GamepadInput;
  action2Negative: GamepadInput;
  autoStabilization: GamepadInput;
  depthHold: GamepadInput;
  record: GamepadInput;
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
  infoLogging: boolean;
  keyboard: KeyboardBindings;
  selectedGamepadId: string | null;
  gamepad: Record<string, GamepadBindings>;
};

const defaultKeyboardInput = (key: KeyboardKey): KeyboardInput => ({
  key,
  minValue: 0,
  maxValue: 1,
});

const defaultKeyboardBindings: KeyboardBindings = {
  surgeForward: defaultKeyboardInput('KeyW'),
  surgeBackward: defaultKeyboardInput('KeyS'),
  swayRight: defaultKeyboardInput('KeyD'),
  swayLeft: defaultKeyboardInput('KeyA'),
  heaveUp: defaultKeyboardInput('Space'),
  heaveDown: defaultKeyboardInput('ShiftLeft'),
  pitchUp: defaultKeyboardInput('KeyI'),
  pitchDown: defaultKeyboardInput('KeyK'),
  yawRight: defaultKeyboardInput('KeyL'),
  yawLeft: defaultKeyboardInput('KeyJ'),
  rollLeft: defaultKeyboardInput('KeyQ'),
  rollRight: defaultKeyboardInput('KeyE'),
  action1Positive: defaultKeyboardInput('Digit1'),
  action1Negative: defaultKeyboardInput('Digit2'),
  action2Positive: defaultKeyboardInput('Digit3'),
  action2Negative: defaultKeyboardInput('Digit4'),
  autoStabilization: defaultKeyboardInput('KeyU'),
  depthHold: defaultKeyboardInput('KeyO'),
  record: defaultKeyboardInput('KeyR'),
};

const defaultGamepadInputButton = (index: number): GamepadInput => ({
  input: { Button: index },
  minValue: 0,
  maxValue: 1,
});

const defaultGamepadInputAxis = (
  index: number,
  minValue: number,
  maxValue: number,
): GamepadInput => ({
  input: { Axis: index },
  minValue,
  maxValue,
});

const createDefaultGamepadBindings = (): GamepadBindings => ({
  surgeForward: defaultGamepadInputAxis(1, 0, -1),
  surgeBackward: defaultGamepadInputAxis(1, 0, 1),
  swayRight: defaultGamepadInputAxis(0, 0, 1),
  swayLeft: defaultGamepadInputAxis(0, 0, -1),
  heaveUp: defaultGamepadInputButton(7),
  heaveDown: defaultGamepadInputButton(6),
  pitchUp: defaultGamepadInputAxis(3, 0, -1),
  pitchDown: defaultGamepadInputAxis(3, 0, 1),
  yawRight: defaultGamepadInputAxis(2, 0, 1),
  yawLeft: defaultGamepadInputAxis(2, 0, -1),
  rollLeft: defaultGamepadInputButton(4),
  rollRight: defaultGamepadInputButton(5),
  action1Positive: defaultGamepadInputButton(0),
  action1Negative: defaultGamepadInputButton(1),
  action2Positive: defaultGamepadInputButton(2),
  action2Negative: defaultGamepadInputButton(3),
  autoStabilization: defaultGamepadInputButton(12),
  depthHold: defaultGamepadInputButton(13),
  record: defaultGamepadInputButton(9),
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
  infoLogging: false,
  keyboard: defaultKeyboardBindings,
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
  defaultKeyboardBindings,
  createDefaultGamepadBindings,
  type KeyboardKey,
  type GamepadInputType,
  type KeyboardInput,
  type GamepadInput,
  type KeyboardBindings,
  type GamepadBindings,
  type AttitudeIndicator as AttitudeIndicatorType,
  type Config,
};
