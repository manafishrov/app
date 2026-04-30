export const AttitudeIndicator = {
  scientific: 'scientific',
  model3D: 'model3D',
  classic: 'classic',
  disabled: 'disabled',
} as const;

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
  desiredDepthEntry: NullableKeyboardInput;
  desiredDepthIncrease: NullableKeyboardInput;
  desiredDepthDecrease: NullableKeyboardInput;
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
  desiredDepthEntry: NullableGamepadInput;
  desiredDepthIncrease: NullableGamepadInput;
  desiredDepthDecrease: NullableGamepadInput;
  record: NullableGamepadInput;
};

export type AttitudeIndicator = (typeof AttitudeIndicator)[keyof typeof AttitudeIndicator];

type Config = {
  appVersion: string;
  overlayScale: number;
  attitudeIndicator: AttitudeIndicator;
  workIndicator: boolean;
  thrusterRpmOverlay: boolean;
  videoDirectory: string;
  checkForUpdatesOnStartup: boolean;
  ipAddress: string;
  webrtcSignalingApiPort: number;
  webrtcSignalingApiPath: string;
  webSocketPort: number;
  keyboard: KeyboardBindings;
  selectedGamepadId: string | null;
  gamepad: Record<string, GamepadBindings>;
};

export type {
  KeyboardKey,
  GamepadInputType,
  KeyboardInput,
  GamepadInput,
  KeyboardBindings,
  GamepadBindings,
  Config,
};
