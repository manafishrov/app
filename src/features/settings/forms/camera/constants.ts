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
// Absolute outer bound across every resolution/crop-FOV combination (the imx477's fastest crop-mode ceiling below). The real, situation-specific ceiling always comes from getMaxFramerate - this only bounds the zod schema and number input.
export const ABSOLUTE_MAX_FRAMERATE = 120;

// Two imx477 sensor modes are used, matched to real libcamera modes so `--mode` stays valid on the firmware side: full-FOV is 2028x1520 (SRGGB12, "2028:1520:12:P"), full sensor width and height, max 40 fps, used for every resolution when Crop FOV is off and always for the Max preset (nothing smaller left to crop to); crop is 1332x990 (SRGGB10, "1332:990:10:P"), a ~2/3 crop of the sensor, max 120 fps, used for resolutions smaller than Max when Crop FOV is on.
const CROP_MODE_MAX_WIDTH = 1332;
const CROP_MODE_MAX_HEIGHT = 990;
const CROP_MODE_MAX_FRAMERATE = 120;
const FULL_FOV_MAX_FRAMERATE = 40;

// H.264 level 4 macroblock-rate ceiling (245,760 MB/s). Levels 4 and 4.1 share this exact figure; level 4.2 is higher. Using level 4's figure regardless of which level is selected elsewhere keeps every framerate/resolution combination valid no matter what the user has picked there.
const H264_LEVEL4_MAX_MACROBLOCKS_PER_SECOND = 245_760;
const MACROBLOCK_SIZE = 16;

const toMacroblockCount = (pixels: number): number => Math.ceil(pixels / MACROBLOCK_SIZE);

const getEncoderFramerateCeiling = (width: number, height: number): number => {
  const macroblocksPerFrame = toMacroblockCount(width) * toMacroblockCount(height);
  return Math.floor(H264_LEVEL4_MAX_MACROBLOCKS_PER_SECOND / macroblocksPerFrame);
};

// The highest framerate the given resolution can actually reach, combining the imx477 sensor mode's hardware ceiling with the H.264 encoder's macroblock-rate ceiling - whichever is lower.
export const getMaxFramerate = (width: number, height: number, cropFov: boolean): number => {
  const fitsCropMode = width <= CROP_MODE_MAX_WIDTH && height <= CROP_MODE_MAX_HEIGHT;
  const sensorCeiling = cropFov && fitsCropMode ? CROP_MODE_MAX_FRAMERATE : FULL_FOV_MAX_FRAMERATE;
  return Math.min(sensorCeiling, getEncoderFramerateCeiling(width, height));
};

export const MIN_BITRATE_MBPS = 1;
export const MAX_BITRATE_MBPS = 25;
export const BITRATE_BPS_PER_MBPS = 1_000_000;

// Bits-per-pixel target for the automatic bitrate calculation. 0.15 sits at the upper end of the typical H.264 range (0.1-0.2) because this stream uses the baseline profile (no B-frames/CABAC), which needs more bits than main/high for the same visual quality, and ROV footage is continuous-motion content.
const BITS_PER_PIXEL = 0.15;

// The bitrate that best matches a given resolution/framerate: enough bits to avoid encoder starvation (blocky, stuttering video), without so many that they just congest the link to the ROV for no visual benefit.
export const computeAutomaticBitrateMbps = (
  width: number,
  height: number,
  framerate: number,
): number => {
  const targetMbps = Math.round(
    (width * height * framerate * BITS_PER_PIXEL) / BITRATE_BPS_PER_MBPS,
  );
  return Math.min(Math.max(targetMbps, MIN_BITRATE_MBPS), MAX_BITRATE_MBPS);
};

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
