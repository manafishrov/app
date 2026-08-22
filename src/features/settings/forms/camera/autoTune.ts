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

export const resolveResolutionOption = (resolutionKey: string): ResolutionOption | undefined =>
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

const applyResolutionConstraints = (
  form: CameraTuningForm,
  resolutionKey: string,
  cropFov: boolean,
): void => {
  const resolution = resolveResolutionOption(resolutionKey);
  if (!resolution) {
    return;
  }
  const currentFramerate = form.getFieldValue('framerate');
  const framerate = Math.min(
    currentFramerate,
    getMaxFramerate(resolution.width, resolution.height, cropFov),
  );
  if (framerate !== currentFramerate) {
    form.setFramerate(framerate);
  }
  if (form.getFieldValue('automaticBitrate')) {
    form.setBitrateMbps([
      computeAutomaticBitrateMbps(resolution.width, resolution.height, framerate),
    ]);
  }
};

// Preserve the user's frame rate when changing resolution or crop mode. Only
// Clamp it when the new combination cannot support the existing value.
export const createCameraAutoTune = (form: CameraTuningForm): CameraAutoTune => {
  const applyForResolutionAndCropFov = (resolutionKey: string, cropFov: boolean): void => {
    applyResolutionConstraints(form, resolutionKey, cropFov);
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
