import { describe, expect, it } from 'vitest';

import { CurrentSensingMode, DshotSpeed, McuBoard, ThrusterProtocol } from '@/stores/rovConfig';

import {
  createMcuBoardChangeHandler,
  formSchema,
  getCompatibleDshotSpeed,
  getDshotSpeedFormValue,
  parseDshotSpeed,
} from './schema';

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

  it('round trips every supported DShot speed', () => {
    const speeds = [
      ['150', DshotSpeed.dshot150],
      ['300', DshotSpeed.dshot300],
      ['600', DshotSpeed.dshot600],
      ['1200', DshotSpeed.dshot1200],
    ] as const;

    for (const [formValue, configValue] of speeds) {
      expect(parseDshotSpeed(formValue, DshotSpeed.dshot300)).toBe(configValue);
      expect(getDshotSpeedFormValue(configValue)).toBe(formValue);
    }
  });

  it('uses the provided fallback for unknown and missing DShot speeds', () => {
    const missingValue = new Map<string, string>().get('missing');

    expect(parseDshotSpeed('invalid', DshotSpeed.dshot600)).toBe(DshotSpeed.dshot600);
    expect(parseDshotSpeed(missingValue, DshotSpeed.dshot150)).toBe(DshotSpeed.dshot150);
  });
});

describe('MCU board changes', () => {
  it('updates an incompatible board and speed together', () => {
    const updates: string[] = [];
    const handleBoardChange = createMcuBoardChangeHandler(
      () => '1200',
      (speed) => updates.push(`speed:${speed}`),
      (board) => updates.push(`board:${board}`),
    );

    handleBoardChange(McuBoard.pico);

    expect(updates).toEqual(['speed:600', 'board:pico']);
  });
});
