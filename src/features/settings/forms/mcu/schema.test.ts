import { describe, expect, it } from 'vitest';

import { CurrentSensingMode, McuBoard, ThrusterProtocol } from '@/stores/rovConfig';

import { formSchema, getCompatibleDshotSpeed } from './schema';

const values = {
  mcuBoard: [McuBoard.pico],
  thrusterProtocol: [ThrusterProtocol.dshot],
  dshotSpeed: ['1200'],
  currentSensingMode: [CurrentSensingMode.perMotor],
} as const;

describe('MCU settings schema', () => {
  it('rejects DShot1200 for a regular Pico', () => {
    expect(formSchema.safeParse(values).success).toBe(false);
  });

  it('accepts DShot1200 for Pico 2', () => {
    expect(
      formSchema.safeParse({
        ...values,
        mcuBoard: [McuBoard.pico2],
      }).success,
    ).toBe(true);
  });

  it('downgrades DShot1200 to DShot600 when switching to a regular Pico', () => {
    expect(getCompatibleDshotSpeed(McuBoard.pico, '1200')).toBe('600');
  });

  it('preserves supported speeds and Pico 2 DShot1200', () => {
    expect(getCompatibleDshotSpeed(McuBoard.pico, '300')).toBe('300');
    expect(getCompatibleDshotSpeed(McuBoard.pico2, '1200')).toBe('1200');
  });
});
