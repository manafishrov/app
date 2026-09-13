import { describe, expect, it } from 'vitest';

import { hasUsableBindingRange } from './bindingRange';

const MIDPOINT = 0.5;
const REVERSED_MIN = -1;

describe('gamepad binding range validation', () => {
  it('rejects equal endpoints after capture rounding', () => {
    expect(hasUsableBindingRange(MIDPOINT, MIDPOINT)).toBe(false);
  });

  it('accepts forward and reversed ranges', () => {
    expect(hasUsableBindingRange(0, 1)).toBe(true);
    expect(hasUsableBindingRange(1, REVERSED_MIN)).toBe(true);
  });
});
