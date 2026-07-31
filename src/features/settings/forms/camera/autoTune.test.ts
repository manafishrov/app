import { describe, expect, it, vi } from 'vitest';

import { createCameraAutoTune, type CameraTuningForm } from './autoTune';
import { ResolutionKey } from './constants';

const DEFAULT_FRAMERATE = 30;
const UPDATED_FRAMERATE = 60;
const EXPECTED_BITRATE_MBPS = 3;
const MAX_FULL_FOV_FRAMERATE = 40;
const MAX_CROP_FRAMERATE = 120;
const CROP_BITRATE_MBPS = 6;
const DEFAULT_BITRATE_MBPS = 1;

type FormState = {
  automaticBitrate: boolean;
  cropFov?: boolean;
  framerate?: number;
  resolution?: ResolutionKey;
};

const createForm = ({
  automaticBitrate,
  cropFov = false,
  framerate = DEFAULT_FRAMERATE,
  resolution = ResolutionKey.low,
}: FormState): CameraTuningForm => {
  function getFieldValue(name: 'resolution'): ResolutionKey[];
  function getFieldValue(name: 'cropFov' | 'automaticBitrate'): boolean;
  function getFieldValue(name: 'framerate'): number;
  function getFieldValue(
    name: 'resolution' | 'cropFov' | 'automaticBitrate' | 'framerate',
  ): ResolutionKey[] | boolean | number {
    if (name === 'resolution') {
      return [resolution];
    }
    if (name === 'automaticBitrate') {
      return automaticBitrate;
    }
    if (name === 'framerate') {
      return framerate;
    }
    return cropFov;
  }

  return {
    getFieldValue,
    setFramerate: vi.fn(),
    setBitrateMbps: vi.fn(),
  };
};

describe('camera automatic bitrate tuning', () => {
  it('updates bitrate when framerate changes in automatic mode', () => {
    const form = createForm({ automaticBitrate: true });
    const autoTune = createCameraAutoTune(form);

    autoTune.handleFramerateChange(UPDATED_FRAMERATE);

    expect(form.setBitrateMbps).toHaveBeenCalledWith([EXPECTED_BITRATE_MBPS]);
  });

  it('preserves manual bitrate when framerate changes', () => {
    const form = createForm({ automaticBitrate: false });
    const autoTune = createCameraAutoTune(form);

    autoTune.handleFramerateChange(UPDATED_FRAMERATE);

    expect(form.setBitrateMbps).not.toHaveBeenCalled();
  });

  it('lowers the framerate ceiling when resolution increases', () => {
    const form = createForm({ automaticBitrate: false, cropFov: true });
    const autoTune = createCameraAutoTune(form);

    autoTune.handleResolutionChange(ResolutionKey.max);

    expect(form.setFramerate).toHaveBeenCalledWith(MAX_FULL_FOV_FRAMERATE);
    expect(form.setBitrateMbps).not.toHaveBeenCalled();
  });

  it('raises framerate and retunes bitrate when crop FOV is enabled', () => {
    const form = createForm({ automaticBitrate: true });
    const autoTune = createCameraAutoTune(form);

    autoTune.handleCropFovChange(true);

    expect(form.setFramerate).toHaveBeenCalledWith(MAX_CROP_FRAMERATE);
    expect(form.setBitrateMbps).toHaveBeenCalledWith([CROP_BITRATE_MBPS]);
  });

  it('retunes bitrate when automatic mode is enabled', () => {
    const form = createForm({ automaticBitrate: false });
    const autoTune = createCameraAutoTune(form);

    autoTune.handleAutomaticBitrateChange(true);

    expect(form.setBitrateMbps).toHaveBeenCalledWith([DEFAULT_BITRATE_MBPS]);
  });
});
