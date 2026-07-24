// 4:3 resolution presets matching the imx477 sensor (native 4056x3040), so every option uses the full sensor field of view instead of a 16:9 crop.
// Sizes stay within the Raspberry Pi hardware H.264 encoder limit (width <= 2048 and a <= 1920x1080 macroblock budget); larger frames fail to encode and the stream never starts.
export const ResolutionKey = {
  lowest: 'lowest',
  low: 'low',
  standard: 'standard',
  high: 'high',
  max: 'max',
} as const;

export type ResolutionKey = (typeof ResolutionKey)[keyof typeof ResolutionKey];

export type ResolutionOption = {
  value: ResolutionKey;
  width: number;
  height: number;
};

/* oxlint-disable no-magic-numbers */
export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { value: ResolutionKey.lowest, width: 320, height: 240 },
  { value: ResolutionKey.low, width: 640, height: 480 },
  { value: ResolutionKey.standard, width: 1024, height: 768 },
  { value: ResolutionKey.high, width: 1280, height: 960 },
  { value: ResolutionKey.max, width: 1440, height: 1080 },
];
/* oxlint-enable no-magic-numbers */

export const MIN_FRAMERATE = 1;
// The full-FOV 2028x1520 sensor mode caps at 40 fps, also the H.264 level-4 macroblock-rate ceiling for the largest option (1440x1080).
export const MAX_FRAMERATE = 40;

export const MIN_BITRATE_MBPS = 1;
export const MAX_BITRATE_MBPS = 25;
export const BITRATE_BPS_PER_MBPS = 1_000_000;

export const MIN_KEYFRAME_INTERVAL = 1;
export const MAX_KEYFRAME_INTERVAL = 300;

export const MIN_EXPOSURE_VALUE = -8;
export const MAX_EXPOSURE_VALUE = 8;
export const EXPOSURE_STEP = 0.1;

export const MIN_BRIGHTNESS = -1;
export const MAX_BRIGHTNESS = 1;
export const BRIGHTNESS_STEP = 0.05;

export const MIN_IMAGE_ADJUSTMENT = 0;
export const MAX_IMAGE_ADJUSTMENT = 4;
export const IMAGE_ADJUSTMENT_STEP = 0.05;

export const ROTATION_FLIPPED = 180;

export type CameraRotation = '0' | '180';
