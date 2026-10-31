import { describe, expect, it } from 'vitest';

import { thrusterRpmFor } from './thrusterRpm';

/* oxlint-disable no-magic-numbers -- pin setups and RPM fixtures */
const RPMS = [100, 200, 300, 400, 500, 600, 700, 800];

describe('thruster RPM by identifier', () => {
  it('reads pins in order when the pin setup is the identity', () => {
    const identity = [0, 1, 2, 3, 4, 5, 6, 7];
    expect([0, 1, 7].map((thruster) => thrusterRpmFor(thruster, identity, RPMS))).toEqual([
      100, 200, 800,
    ]);
  });

  it('follows the pin each thruster is wired to', () => {
    const reversed = [7, 6, 5, 4, 3, 2, 1, 0];
    expect(thrusterRpmFor(0, reversed, RPMS)).toBe(800);
    expect(thrusterRpmFor(7, reversed, RPMS)).toBe(100);
    expect(thrusterRpmFor(2, [3, 0, 2, 1, 4, 5, 6, 7], RPMS)).toBe(300);
    expect(thrusterRpmFor(1, [3, 0, 2, 1, 4, 5, 6, 7], RPMS)).toBe(400);
  });

  it('uses the first pin when several drive the same thruster', () => {
    expect(thrusterRpmFor(6, [6, 6, 2, 3, 4, 5, 1, 7], RPMS)).toBe(100);
  });

  it('reads zero for a thruster no pin drives', () => {
    expect(thrusterRpmFor(0, [1, 1, 2, 3, 4, 5, 6, 7], RPMS)).toBe(0);
  });
});
