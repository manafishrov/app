import { describe, expect, it } from 'vitest';

import { createPiUndervoltageWarningGate } from './piUndervoltageWarningGate';

describe('createPiUndervoltageWarningGate', () => {
  it('warns once for each connected undervoltage episode', () => {
    const shouldShowWarning = createPiUndervoltageWarningGate();

    expect(shouldShowWarning(false, true)).toBe(false);
    expect(shouldShowWarning(true, true)).toBe(true);
    expect(shouldShowWarning(true, true)).toBe(false);
    expect(shouldShowWarning(true, false)).toBe(false);
    expect(shouldShowWarning(true, true)).toBe(true);
  });

  it('warns again if the ROV reconnects while undervoltage is active', () => {
    const shouldShowWarning = createPiUndervoltageWarningGate();

    expect(shouldShowWarning(true, true)).toBe(true);
    expect(shouldShowWarning(false, true)).toBe(false);
    expect(shouldShowWarning(true, true)).toBe(true);
  });
});
