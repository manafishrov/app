import { describe, expect, it, vi } from 'vitest';

import { createCameraAutoTune, type CameraTuningForm } from './autoTune';
import { ResolutionKey } from './constants';

const DEFAULT_FRAMERATE = 30;
const UPDATED_FRAMERATE = 60;
const EXPECTED_BITRATE_MBPS = 3;

const createForm = (automaticBitrate: boolean): CameraTuningForm => {
  function getFieldValue(name: 'resolution'): ResolutionKey[];
  function getFieldValue(name: 'cropFov' | 'automaticBitrate'): boolean;
  function getFieldValue(name: 'framerate'): number;
  function getFieldValue(
    name: 'resolution' | 'cropFov' | 'automaticBitrate' | 'framerate',
  ): ResolutionKey[] | boolean | number {
    if (name === 'resolution') {
      return [ResolutionKey.low];
    }
    if (name === 'automaticBitrate') {
      return automaticBitrate;
    }
    if (name === 'framerate') {
      return DEFAULT_FRAMERATE;
    }
    return false;
  }

  return {
    getFieldValue,
    setFramerate: vi.fn(),
    setBitrateMbps: vi.fn(),
  };
};

describe('camera automatic bitrate tuning', () => {
  it('updates bitrate when framerate changes in automatic mode', () => {
    const form = createForm(true);
    const autoTune = createCameraAutoTune(form);

    autoTune.handleFramerateChange(UPDATED_FRAMERATE);

    expect(form.setBitrateMbps).toHaveBeenCalledWith([EXPECTED_BITRATE_MBPS]);
  });

  it('preserves manual bitrate when framerate changes', () => {
    const form = createForm(false);
    const autoTune = createCameraAutoTune(form);

    autoTune.handleFramerateChange(UPDATED_FRAMERATE);

    expect(form.setBitrateMbps).not.toHaveBeenCalled();
  });
});
