import { describe, expect, it } from 'vitest';

import {
  createTouchAxes,
  joystickDeflection,
  releaseTouchAxes,
  sliderDeflection,
  TouchAxis,
} from '@/input/touch';

const RADIUS = 50;
const HALF = 0.5;
const BEYOND_TRACK = 2;
const FULL = 1;

describe('joystickDeflection', () => {
  it('scales offsets by the radius', () => {
    expect(joystickDeflection(RADIUS * HALF, -RADIUS * HALF, RADIUS)).toEqual({
      horizontal: HALF,
      vertical: -HALF,
    });
  });

  it('clamps diagonals to the unit circle', () => {
    const { horizontal, vertical } = joystickDeflection(RADIUS, RADIUS, RADIUS);
    expect(Math.hypot(horizontal, vertical)).toBeCloseTo(1);
    expect(horizontal).toBeCloseTo(vertical);
  });

  it('stays centred for a degenerate control', () => {
    expect(joystickDeflection(RADIUS, RADIUS, 0)).toEqual({ horizontal: 0, vertical: 0 });
  });
});

describe('sliderDeflection', () => {
  it('clamps to full deflection beyond the track', () => {
    expect(sliderDeflection(RADIUS * BEYOND_TRACK, RADIUS)).toBe(FULL);
    expect(sliderDeflection(-RADIUS * BEYOND_TRACK, RADIUS)).toBe(-FULL);
    expect(sliderDeflection(RADIUS * HALF, RADIUS)).toBe(HALF);
  });
});

describe('releaseTouchAxes', () => {
  it('returns every axis to neutral', () => {
    const axes = createTouchAxes();
    axes[TouchAxis.surge] = FULL;
    axes[TouchAxis.roll] = -FULL;
    releaseTouchAxes(axes);
    expect(axes).toEqual(createTouchAxes());
  });
});
