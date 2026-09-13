import { describe, expect, it } from 'vitest';

import { formatCurrentDraw } from './currentDraw';

const CURRENT_AMPS = 10;
const FRACTIONAL_CURRENT_AMPS = 10.25;

describe('current above idle', () => {
  it('distinguishes unavailable calibration from measured zero', () => {
    expect(formatCurrentDraw(null)).toBe('— A');
    expect(formatCurrentDraw(0)).toBe('0A');
  });

  it('formats the MCU-corrected total without another offset or division', () => {
    expect(formatCurrentDraw(CURRENT_AMPS)).toBe('10A');
    expect(formatCurrentDraw(FRACTIONAL_CURRENT_AMPS)).toBe('10A');
  });
});
