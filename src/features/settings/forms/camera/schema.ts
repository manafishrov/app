import { z } from 'zod';

import {
  AwbMode,
  type Camera,
  DenoiseMode,
  defaultRovConfig,
  H264Level,
  H264Profile,
  rovConfigStore,
} from '@/stores/rovConfig';

import {
  BITRATE_BPS_PER_MBPS,
  type CameraRotation,
  MAX_BITRATE_MBPS,
  MAX_BRIGHTNESS,
  MAX_EXPOSURE_VALUE,
  MAX_FRAMERATE,
  MAX_IMAGE_ADJUSTMENT,
  MAX_KEYFRAME_INTERVAL,
  MIN_BITRATE_MBPS,
  MIN_BRIGHTNESS,
  MIN_EXPOSURE_VALUE,
  MIN_FRAMERATE,
  MIN_IMAGE_ADJUSTMENT,
  MIN_KEYFRAME_INTERVAL,
  RESOLUTION_OPTIONS,
  ResolutionKey,
  ROTATION_FLIPPED,
} from './constants';

const FORM_SCHEMA = z.object({
  resolution: z
    .array(
      z.enum([
        ResolutionKey.lowest,
        ResolutionKey.low,
        ResolutionKey.standard,
        ResolutionKey.high,
        ResolutionKey.max,
      ]),
    )
    .length(1),
  framerate: z.number().min(MIN_FRAMERATE).max(MAX_FRAMERATE),
  bitrateMbps: z.number().min(MIN_BITRATE_MBPS).max(MAX_BITRATE_MBPS),
  keyframeInterval: z.number().min(MIN_KEYFRAME_INTERVAL).max(MAX_KEYFRAME_INTERVAL),
  profile: z.array(z.enum([H264Profile.baseline, H264Profile.main, H264Profile.high])).length(1),
  level: z.array(z.enum([H264Level.level4, H264Level.level41, H264Level.level42])).length(1),
  rotation: z.array(z.enum(['0', '180'])).length(1),
  hflip: z.boolean(),
  vflip: z.boolean(),
  awb: z
    .array(
      z.enum([
        AwbMode.auto,
        AwbMode.incandescent,
        AwbMode.tungsten,
        AwbMode.fluorescent,
        AwbMode.indoor,
        AwbMode.daylight,
        AwbMode.cloudy,
      ]),
    )
    .length(1),
  exposureValue: z.array(z.number().min(MIN_EXPOSURE_VALUE).max(MAX_EXPOSURE_VALUE)).length(1),
  brightness: z.array(z.number().min(MIN_BRIGHTNESS).max(MAX_BRIGHTNESS)).length(1),
  contrast: z.array(z.number().min(MIN_IMAGE_ADJUSTMENT).max(MAX_IMAGE_ADJUSTMENT)).length(1),
  saturation: z.array(z.number().min(MIN_IMAGE_ADJUSTMENT).max(MAX_IMAGE_ADJUSTMENT)).length(1),
  sharpness: z.array(z.number().min(MIN_IMAGE_ADJUSTMENT).max(MAX_IMAGE_ADJUSTMENT)).length(1),
  denoise: z
    .array(
      z.enum([
        DenoiseMode.auto,
        DenoiseMode.off,
        DenoiseMode.cdnOff,
        DenoiseMode.cdnFast,
        DenoiseMode.cdnHq,
      ]),
    )
    .length(1),
});

export type CameraFormValues = {
  resolution: ResolutionKey[];
  framerate: number;
  bitrateMbps: number;
  keyframeInterval: number;
  profile: H264Profile[];
  level: H264Level[];
  rotation: CameraRotation[];
  hflip: boolean;
  vflip: boolean;
  awb: AwbMode[];
  exposureValue: number[];
  brightness: number[];
  contrast: number[];
  saturation: number[];
  sharpness: number[];
  denoise: DenoiseMode[];
};

export const createCameraFormSchema = (): typeof FORM_SCHEMA => FORM_SCHEMA;

const rotationToString = (rotation: number): CameraRotation =>
  rotation === ROTATION_FLIPPED ? '180' : '0';

// Maps a stored width/height to the closest preset by pixel count, so a device reporting a pre-dropdown resolution still resolves to a defined option (an exact match wins with a zero area difference).
const findResolutionKey = (width: number, height: number): ResolutionKey => {
  const targetArea = width * height;
  let closestValue: ResolutionKey = ResolutionKey.high;
  let smallestDiff = Number.POSITIVE_INFINITY;
  for (const option of RESOLUTION_OPTIONS) {
    const diff = Math.abs(option.width * option.height - targetArea);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closestValue = option.value;
    }
  }
  return closestValue;
};

const cameraToFormValues = (camera: Camera): CameraFormValues => ({
  resolution: [findResolutionKey(camera.width, camera.height)],
  framerate: camera.framerate,
  bitrateMbps: Math.round(camera.bitrate / BITRATE_BPS_PER_MBPS),
  keyframeInterval: camera.keyframeInterval,
  profile: [camera.profile],
  level: [camera.level],
  rotation: [rotationToString(camera.rotation)],
  hflip: camera.hflip,
  vflip: camera.vflip,
  awb: [camera.awb],
  exposureValue: [camera.exposureValue],
  brightness: [camera.brightness],
  contrast: [camera.contrast],
  saturation: [camera.saturation],
  sharpness: [camera.sharpness],
  denoise: [camera.denoise],
});

export const CAMERA_FORM_DEFAULT_VALUES: CameraFormValues = cameraToFormValues(
  defaultRovConfig.camera,
);

export const getCameraFormValues = (): CameraFormValues =>
  cameraToFormValues(rovConfigStore.camera);

export const resolveCameraConfig = (value: CameraFormValues): Camera => {
  const { camera } = rovConfigStore;
  const match = RESOLUTION_OPTIONS.find((option) => option.value === value.resolution[0]);
  const width = match ? match.width : camera.width;
  const height = match ? match.height : camera.height;

  return {
    width,
    height,
    framerate: value.framerate,
    bitrate: Math.round(value.bitrateMbps * BITRATE_BPS_PER_MBPS),
    keyframeInterval: value.keyframeInterval,
    profile: value.profile[0] ?? camera.profile,
    level: value.level[0] ?? camera.level,
    rotation: value.rotation[0] === '180' ? ROTATION_FLIPPED : 0,
    hflip: value.hflip,
    vflip: value.vflip,
    awb: value.awb[0] ?? camera.awb,
    exposureValue: value.exposureValue[0] ?? camera.exposureValue,
    brightness: value.brightness[0] ?? camera.brightness,
    contrast: value.contrast[0] ?? camera.contrast,
    saturation: value.saturation[0] ?? camera.saturation,
    sharpness: value.sharpness[0] ?? camera.sharpness,
    denoise: value.denoise[0] ?? camera.denoise,
  };
};
