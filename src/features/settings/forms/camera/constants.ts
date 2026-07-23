export const MIN_WIDTH = 160;
export const MAX_WIDTH = 4056;
export const MIN_HEIGHT = 160;
export const MAX_HEIGHT = 3040;
export const DIMENSION_STEP = 2;

export const MIN_FRAMERATE = 1;
export const MAX_FRAMERATE = 60;

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
