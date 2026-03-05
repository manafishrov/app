import { createStore, reconcile } from 'solid-js/store';

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

type GamepadInputType = { Button: [number] } | { Axis: [number] };

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
  gamepad: {},
};

const [configStore, setConfigStoreInternal] = createStore<Config>(defaultConfig);

const setConfigStore = (value: Config) => {
  setConfigStoreInternal(reconcile(value));
};

export {
  configStore,
  setConfigStore,
  AttitudeIndicator,
  defaultConfig,
  type KeyboardKey,
  type GamepadInputType,
  type KeyboardInput,
  type GamepadInput,
  type KeyboardBindings,
  type GamepadBindings,
  type AttitudeIndicator as AttitudeIndicatorType,
  type Config,
};
