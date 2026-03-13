import type { GamepadInputType, KeyboardKey } from '@/stores/config';

import * as m from '@/paraglide/messages';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const BIND_CAPTURE_TIMEOUT_MS = 8000;
export const BIND_CAPTURE_SETTLE_MS = 500;
export const GAMEPAD_CAPTURE_THRESHOLD = 0.1;
const BIND_INCREMENT = 0.05;
const DECIMAL_PRECISION = 4;

export const roundToBindIncrement = (value: number): number => {
  const rounded = Math.round(value / BIND_INCREMENT) * BIND_INCREMENT;
  return Number(rounded.toFixed(DECIMAL_PRECISION));
};

export const normalizeBindValue = (
  rawValue: number,
  minValue: number,
  maxValue: number,
): number => {
  const range = maxValue - minValue;
  if (range === 0) {
    return 0;
  }
  return clamp((rawValue - minValue) / range, 0, 1);
};

export const getGamepadRawInputValue = (
  input: GamepadInputType | null,
  gamepad: Gamepad,
): number => {
  if (!input) {
    return 0;
  }

  if ('Button' in input) {
    const index = input.Button;
    const button = gamepad.buttons[index];
    return button ? button.value : 0;
  }

  const index = input.Axis;
  const axisValue = gamepad.axes[index];
  return axisValue ?? 0;
};

export const formatKeyboardKeyLabel = (key: string): string =>
  key
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .replaceAll(/([A-Za-z])(\d)/g, '$1 $2')
    .replaceAll(/(\d)([A-Za-z])/g, '$1 $2')
    .trim();

const NAMED_KEYBOARD_KEYS = new Set([
  'Enter',
  'Escape',
  'Backspace',
  'Tab',
  'Space',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Semicolon',
  'Quote',
  'Backquote',
  'Comma',
  'Period',
  'Slash',
  'CapsLock',
  'ArrowRight',
  'ArrowLeft',
  'ArrowDown',
  'ArrowUp',
  'ControlLeft',
  'ShiftLeft',
  'AltLeft',
  'MetaLeft',
  'ControlRight',
  'ShiftRight',
  'AltRight',
  'MetaRight',
  'PrintScreen',
  'ScrollLock',
  'Pause',
  'Insert',
  'Home',
  'PageUp',
  'Delete',
  'End',
  'PageDown',
  'NumLock',
  'NumpadDivide',
  'NumpadMultiply',
  'NumpadSubtract',
  'NumpadAdd',
  'NumpadEnter',
  'NumpadDecimal',
]);

const isPatternKey = (key: string): boolean => {
  if (/^Key[A-Z]$/.test(key)) {
    return true;
  }
  if (/^Digit[0-9]$/.test(key)) {
    return true;
  }
  if (/^F([1-9]|1[0-2])$/.test(key)) {
    return true;
  }
  if (/^Numpad[0-9]$/.test(key)) {
    return true;
  }
  return false;
};

export const isKeyboardKey = (key: string): key is KeyboardKey =>
  isPatternKey(key) || NAMED_KEYBOARD_KEYS.has(key);

export const formatGamepadInputLabel = (input: GamepadInputType | null): string => {
  if (!input) {
    return m.binding_input_unbound();
  }

  if ('Button' in input) {
    return m.binding_input_button({ index: input.Button });
  }

  return m.binding_input_axis({ index: input.Axis });
};
