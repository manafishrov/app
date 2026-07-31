import {
  computeAutomaticBitrateMbps,
  getMaxFramerate,
  RESOLUTION_OPTIONS,
  type ResolutionKey,
  type ResolutionOption,
} from './constants';

// Narrow, typed subset of the TanStack form used only by the auto-tuning logic below (see the Power form's identical pattern for cross-field reads). setFieldValue is passed as two field-specific closures rather than the form's own generic setFieldValue: its real (conditional-type) signature doesn't assign cleanly to a two-field overload here.
export type CameraTuningForm = {
  getFieldValue: {
    (name: 'resolution'): ResolutionKey[];
    (name: 'cropFov' | 'automaticBitrate'): boolean;
    (name: 'framerate'): number;
  };
  setFramerate: (value: number) => void;
  setBitrateMbps: (value: number[]) => void;
};

export type CameraAutoTune = {
  handleResolutionChange: (resolutionKey: string) => void;
  handleCropFovChange: (cropFov: boolean) => void;
  handleFramerateChange: (framerate: number) => void;
  handleAutomaticBitrateChange: (automaticBitrate: boolean) => void;
};

const resolveResolutionOption = (resolutionKey: string): ResolutionOption | undefined =>
  RESOLUTION_OPTIONS.find((option) => option.value === resolutionKey);

const updateAutomaticBitrate = (form: CameraTuningForm, framerate: number): void => {
  const [resolutionKey] = form.getFieldValue('resolution');
  if (!resolutionKey) {
    return;
  }
  const resolution = resolveResolutionOption(resolutionKey);
  if (!resolution) {
    return;
  }
  form.setBitrateMbps([
    computeAutomaticBitrateMbps(resolution.width, resolution.height, framerate),
  ]);
};

// Whenever the resolution or Crop FOV changes, the frame rate is pushed to the new highest possible value for that combination - never left at a stale rate that might now be too high (invalid) or needlessly low.
// When Automatic bitrate is on, the bitrate is recalculated for the resulting combination too.
export const createCameraAutoTune = (form: CameraTuningForm): CameraAutoTune => {
  const applyForResolutionAndCropFov = (resolutionKey: string, cropFov: boolean): void => {
    const resolution = resolveResolutionOption(resolutionKey);
    if (!resolution) {
      return;
    }
    const framerate = getMaxFramerate(resolution.width, resolution.height, cropFov);
    form.setFramerate(framerate);
    if (form.getFieldValue('automaticBitrate')) {
      form.setBitrateMbps([
        computeAutomaticBitrateMbps(resolution.width, resolution.height, framerate),
      ]);
    }
  };

  const handleResolutionChange = (resolutionKey: string): void => {
    applyForResolutionAndCropFov(resolutionKey, form.getFieldValue('cropFov'));
  };

  const handleCropFovChange = (cropFov: boolean): void => {
    const [resolutionKey] = form.getFieldValue('resolution');
    if (!resolutionKey) {
      return;
    }
    applyForResolutionAndCropFov(resolutionKey, cropFov);
  };

  const handleFramerateChange = (framerate: number): void => {
    if (form.getFieldValue('automaticBitrate')) {
      updateAutomaticBitrate(form, framerate);
    }
  };

  const handleAutomaticBitrateChange = (automaticBitrate: boolean): void => {
    if (!automaticBitrate) {
      return;
    }
    updateAutomaticBitrate(form, form.getFieldValue('framerate'));
  };

  return {
    handleResolutionChange,
    handleCropFovChange,
    handleFramerateChange,
    handleAutomaticBitrateChange,
  };
};
