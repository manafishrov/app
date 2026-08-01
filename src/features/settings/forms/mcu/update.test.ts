import { describe, expect, it } from 'vitest';

import { CurrentSensingMode, DshotSpeed, McuBoard, ThrusterProtocol } from '@/stores/rovConfig';

import { updateMcuConfig, type ResolvedMcuConfig } from './update';

const config: ResolvedMcuConfig = {
  mcuBoard: McuBoard.pico2,
  thrusterProtocol: ThrusterProtocol.dshot,
  dshotSpeed: DshotSpeed.dshot1200,
  currentSensingMode: CurrentSensingMode.perMotor,
};

describe('changed MCU board', () => {
  it('waits for the config update before flashing', () => {
    const calls: string[] = [];
    const update = updateMcuConfig(
      { config, previousBoard: McuBoard.pico },
      {
        setConfig: () => {
          calls.push('config');
          return Promise.resolve();
        },
        flashFirmware: () => {
          calls.push('flash');
          return Promise.resolve();
        },
      },
    );

    expect(calls).toEqual(['config']);
    return update.then(() => {
      expect(calls).toEqual(['config', 'flash']);
    });
  });

  it('does not flash when the config update fails', () => {
    let flashCalled = false;

    return expect(
      updateMcuConfig(
        { config, previousBoard: McuBoard.pico },
        {
          setConfig: () => Promise.reject(new Error('config failed')),
          flashFirmware: () => {
            flashCalled = true;
            return Promise.resolve();
          },
        },
      ),
    )
      .rejects.toThrow('config failed')
      .then(() => {
        expect(flashCalled).toBe(false);
      });
  });
});

describe('unchanged MCU board and failures', () => {
  it('does not flash when the board is unchanged', () => {
    let flashCalled = false;

    return updateMcuConfig(
      { config, previousBoard: McuBoard.pico2 },
      {
        setConfig: () => Promise.resolve(),
        flashFirmware: () => {
          flashCalled = true;
          return Promise.resolve();
        },
      },
    ).then(() => {
      expect(flashCalled).toBe(false);
    });
  });

  it('propagates flash failures', () =>
    expect(
      updateMcuConfig(
        { config, previousBoard: McuBoard.pico },
        {
          setConfig: () => Promise.resolve(),
          flashFirmware: () => Promise.reject(new Error('flash failed')),
        },
      ),
    ).rejects.toThrow('flash failed'));
});
