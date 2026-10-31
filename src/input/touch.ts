import type { DirectionVector } from '@/stores/directionVector';

/*
 * Live values of the on-screen controls, indexed like the direction vector.
 * The touch controls write it on every pointer move and the direction vector
 * loop reads it on every tick, so it is a plain mutable array rather than a
 * reactive store.
 */
export type TouchAxes = DirectionVector;

export const TouchAxis = {
  surge: 0,
  sway: 1,
  heave: 2,
  pitch: 3,
  yaw: 4,
  roll: 5,
} as const;

export const createTouchAxes = (): TouchAxes => [0, 0, 0, 0, 0, 0, 0, 0];

export const releaseTouchAxes = (axes: TouchAxes): void => {
  axes.fill(0);
};

const FULL_DEFLECTION = 1;

const clampUnit = (value: number): number =>
  Math.max(-FULL_DEFLECTION, Math.min(FULL_DEFLECTION, value));

/*
 * Position of a pointer relative to a control's centre, scaled so the edge of
 * the control is 1. A joystick clamps the result to the unit circle so
 * diagonals do not exceed full deflection.
 */
export type Deflection = { horizontal: number; vertical: number };

export const joystickDeflection = (
  offsetX: number,
  offsetY: number,
  radius: number,
): Deflection => {
  if (radius <= 0) {
    return { horizontal: 0, vertical: 0 };
  }
  const horizontal = offsetX / radius;
  const vertical = offsetY / radius;
  const length = Math.hypot(horizontal, vertical);
  return length > FULL_DEFLECTION
    ? { horizontal: horizontal / length, vertical: vertical / length }
    : { horizontal, vertical };
};

export const sliderDeflection = (offset: number, halfLength: number): number =>
  halfLength > 0 ? clampUnit(offset / halfLength) : 0;
