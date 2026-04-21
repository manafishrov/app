import { describe, expect, it } from 'vitest';

import type { KeyboardKey } from '@/stores/config';

import {
  formatKeyboardKeyLabel,
  isKeyboardKey,
  normalizeBindValue,
  roundToBindIncrement,
} from '@/input/bindings';

const HALF = 0.5;
const ABOVE_RANGE_VALUE = 2;
const BELOW_RANGE_VALUE = -1;
const CUSTOM_RANGE_MIN = 50;
const CUSTOM_RANGE_MIDPOINT = 75;
const CUSTOM_RANGE_MAX = 100;
const ASCII_UPPERCASE_A = 65;
const LETTER_COUNT = 26;
const DIGIT_COUNT = 10;
const FUNCTION_KEY_COUNT = 12;

const expectAllKeysToBeValid = (keys: readonly string[]): void => {
  for (const key of keys) {
    expect(isKeyboardKey(key)).toBe(true);
  }
};

const expectAllKeysToBeInvalid = (keys: readonly string[]): void => {
  for (const key of keys) {
    expect(isKeyboardKey(key)).toBe(false);
  }
};

describe('roundToBindIncrement', () => {
  const cases = [
    { input: 0, expected: 0 },
    { input: 1, expected: 1 },
    { input: 0.5, expected: 0.5 },
    { input: 0.07, expected: 0.05 },
    { input: 0.08, expected: 0.1 },
    { input: 0.025, expected: 0.05 },
    { input: 0.024, expected: 0 },
    { input: -0.07, expected: -0.05 },
    { input: 10, expected: 10 },
  ];

  for (const { input, expected } of cases) {
    it(`rounds ${input} to ${expected}`, () => {
      expect(roundToBindIncrement(input)).toBe(expected);
    });
  }
});

describe('normalizeBindValue', () => {
  const cases = [
    { args: [HALF, 0, 1] as const, expected: HALF },
    { args: [0, 0, 1] as const, expected: 0 },
    { args: [1, 0, 1] as const, expected: 1 },
    { args: [ABOVE_RANGE_VALUE, 0, 1] as const, expected: 1 },
    { args: [BELOW_RANGE_VALUE, 0, 1] as const, expected: 0 },
    { args: [HALF, 0, 0] as const, expected: 0 },
    {
      args: [CUSTOM_RANGE_MIDPOINT, CUSTOM_RANGE_MIN, CUSTOM_RANGE_MAX] as const,
      expected: HALF,
    },
    { args: [CUSTOM_RANGE_MIN, CUSTOM_RANGE_MIN, CUSTOM_RANGE_MAX] as const, expected: 0 },
    { args: [CUSTOM_RANGE_MAX, CUSTOM_RANGE_MIN, CUSTOM_RANGE_MAX] as const, expected: 1 },
  ];

  for (const {
    args: [rawValue, minValue, maxValue],
    expected,
  } of cases) {
    it(`normalizes (${rawValue}, ${minValue}, ${maxValue}) to ${expected}`, () => {
      expect(normalizeBindValue(rawValue, minValue, maxValue)).toBe(expected);
    });
  }
});

describe('formatKeyboardKeyLabel', () => {
  const cases = [
    { input: 'KeyW', expected: 'Key W' },
    { input: 'ShiftLeft', expected: 'Shift Left' },
    { input: 'ArrowUp', expected: 'Arrow Up' },
    { input: 'Digit1', expected: 'Digit 1' },
    { input: 'F12', expected: 'F 12' },
    { input: 'NumpadMultiply', expected: 'Numpad Multiply' },
    { input: 'CapsLock', expected: 'Caps Lock' },
  ];

  for (const { input, expected } of cases) {
    it(`formats ${input} as ${expected}`, () => {
      expect(formatKeyboardKeyLabel(input)).toBe(expected);
    });
  }
});

describe('isKeyboardKey', () => {
  it('accepts KeyA through KeyZ', () => {
    const keys = Array.from(
      { length: LETTER_COUNT },
      (_, index) => `Key${String.fromCodePoint(ASCII_UPPERCASE_A + index)}`,
    );

    expectAllKeysToBeValid(keys);
  });

  it('accepts Digit0 through Digit9', () => {
    const keys = Array.from({ length: DIGIT_COUNT }, (_, index) => `Digit${index}`);

    expectAllKeysToBeValid(keys);
  });

  it('accepts F1 through F12', () => {
    const keys = Array.from({ length: FUNCTION_KEY_COUNT }, (_, index) => `F${index + 1}`);

    expectAllKeysToBeValid(keys);
  });

  it('accepts Numpad0 through Numpad9', () => {
    const keys = Array.from({ length: DIGIT_COUNT }, (_, index) => `Numpad${index}`);

    expectAllKeysToBeValid(keys);
  });

  it('accepts named keyboard keys', () => {
    const keys: KeyboardKey[] = ['Enter', 'Escape', 'Space', 'ArrowUp', 'ShiftLeft'];

    expectAllKeysToBeValid(keys);
  });

  it('rejects invalid keys', () => {
    const keys = ['KeyAB', 'Key1', 'F0', 'F13', '', 'RandomKey'];

    expectAllKeysToBeInvalid(keys);
  });
});
