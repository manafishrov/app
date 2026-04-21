import { describe, expect, it } from 'vitest';

import type { KeyboardInput } from '@/stores/config';

import { getKeyboardValue } from '@/input/keyboard';

const CUSTOM_RANGE_MIN = 0.2;
const CUSTOM_RANGE_MAX = 0.8;

const createNullKeyboardInput = (): KeyboardInput | null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null match result');
  }
  return result;
};

describe('getKeyboardValue', () => {
  it('returns 0 for null input', () => {
    expect(getKeyboardValue(createNullKeyboardInput(), new Set())).toBe(0);
  });

  it('returns 1 when key is pressed in the identity range', () => {
    const input: KeyboardInput = {
      key: 'KeyW',
      minValue: 0,
      maxValue: 1,
    };

    expect(getKeyboardValue(input, new Set(['KeyW']))).toBe(1);
  });

  it('returns 0 when key is not pressed in the identity range', () => {
    const input: KeyboardInput = {
      key: 'KeyW',
      minValue: 0,
      maxValue: 1,
    };

    expect(getKeyboardValue(input, new Set<string>())).toBe(0);
  });

  it('normalizes a pressed key for a custom range', () => {
    const input: KeyboardInput = {
      key: 'KeyW',
      minValue: CUSTOM_RANGE_MIN,
      maxValue: CUSTOM_RANGE_MAX,
    };

    expect(getKeyboardValue(input, new Set(['KeyW']))).toBe(1);
  });

  it('normalizes an unpressed key for a custom range', () => {
    const input: KeyboardInput = {
      key: 'KeyW',
      minValue: CUSTOM_RANGE_MIN,
      maxValue: CUSTOM_RANGE_MAX,
    };

    expect(getKeyboardValue(input, new Set<string>())).toBe(0);
  });
});
