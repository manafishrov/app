const HALF = 2;
const PITCH_SCALE_DIVISOR = 200;
const YAW_SCALE_DIVISOR = 180;
const FULL_CIRCLE = 360;
const HALF_CIRCLE = 180;
const NEG_HALF_CIRCLE = -180;

export const VIEWBOX_OFFSET = 0.05;
export const VIEWBOX_SIZE = 1.1;
export const CIRCLE_RADIUS_OFFSET = 0.05;
export const CIRCLE_STROKE_WIDTH = 0.01;

export const DEG_NEG_180 = -180;
export const DEG_NEG_135 = -135;
export const DEG_NEG_90 = -90;
export const DEG_NEG_60 = -60;
export const DEG_NEG_45 = -45;
export const DEG_NEG_30 = -30;
export const DEG_NEG_15 = -15;
export const DEG_0 = 0;
export const DEG_15 = 15;
export const DEG_30 = 30;
export const DEG_45 = 45;
export const DEG_60 = 60;
export const DEG_90 = 90;
export const DEG_135 = 135;
export const DEG_180 = 180;

export const PITCH_LINES = [
  DEG_NEG_90,
  DEG_NEG_60,
  DEG_NEG_30,
  DEG_NEG_15,
  DEG_0,
  DEG_15,
  DEG_30,
  DEG_60,
  DEG_90,
];
export const PITCH_LINE_OFFSET = 0.4;
export const PITCH_LINE_STROKE_WIDTH = 0.005;
export const PITCH_TEXT_OFFSET_X = 0.025;
export const PITCH_TEXT_OFFSET_Y = 0.025;
export const PITCH_TEXT_SIZE = 0.05;

export const YAW_LINES = [
  DEG_NEG_180,
  DEG_NEG_135,
  DEG_NEG_90,
  DEG_NEG_45,
  DEG_0,
  DEG_45,
  DEG_90,
  DEG_135,
  DEG_180,
];
export const YAW_LINE_Y1 = 0.075;
export const YAW_LINE_Y2 = 0.125;
export const YAW_LINE_STROKE_WIDTH = 0.01;
export const YAW_TEXT_Y = 0.17;
export const YAW_TEXT_SIZE = 0.06;

export const DESIRED_LINE_OFFSET = 0.25;
export const DESIRED_LINE_STROKE_WIDTH = 0.01;
export const DESIRED_LINE_DASH = 0.02;
export const DESIRED_PATH_OFFSET_1 = 0.02;
export const DESIRED_PATH_OFFSET_2 = 0.04;

export const ACTUAL_LINE_OFFSET_1 = 0.25;
export const ACTUAL_LINE_OFFSET_2 = 0.075;
export const ACTUAL_LINE_STROKE_WIDTH = 0.01;
export const ACTUAL_CIRCLE_RADIUS = 0.02;
export const ACTUAL_PATH_OFFSET_1 = 0.02;
export const ACTUAL_PATH_OFFSET_2 = 0.04;

export const INFO_TEXT_X1 = 0.1;
export const INFO_TEXT_Y1 = 0.15;
export const INFO_TEXT_Y2 = 0.1;
export const INFO_TEXT_X2 = 0.4;
export const INFO_TEXT_SIZE = 0.06;

const YAW_TEXT_TRANSLATE_Y_180 = 2;
const YAW_TEXT_TRANSLATE_Y_0 = -2;
const YAW_TEXT_TRANSLATE_Y_DEFAULT = 1;

const DEGREE_LABELS: Record<number, number> = {
  [DEG_NEG_180]: DEG_90,
  [DEG_NEG_135]: DEG_NEG_45,
  [DEG_NEG_90]: DEG_0,
  [DEG_NEG_45]: DEG_45,
  [DEG_0]: DEG_NEG_90,
  [DEG_45]: DEG_NEG_45,
  [DEG_90]: DEG_0,
  [DEG_135]: DEG_45,
  [DEG_180]: DEG_90,
};

export const getScientificCenter = (size: number): number => size / HALF;
export const getScientificPitchScale = (size: number): number => size / PITCH_SCALE_DIVISOR;
export const getScientificYawScale = (size: number): number => size / YAW_SCALE_DIVISOR;
export const getScientificTextSize = (size: number, ratio: number): string => `${size * ratio}px`;
export const getScientificDegreeLabel = (deg: number): number | string => DEGREE_LABELS[deg] ?? '';

export const getScientificTranslateY = (deg: number): number => {
  if (deg === NEG_HALF_CIRCLE || deg === HALF_CIRCLE) {
    return YAW_TEXT_TRANSLATE_Y_180;
  }

  if (deg === DEG_0) {
    return YAW_TEXT_TRANSLATE_Y_0;
  }

  return YAW_TEXT_TRANSLATE_Y_DEFAULT;
};

export const computeScientificDeltaYaw = (desiredYaw: number, yaw: number): number => {
  let deltaYaw = desiredYaw - yaw;

  while (deltaYaw > HALF_CIRCLE) {
    deltaYaw -= FULL_CIRCLE;
  }

  while (deltaYaw < NEG_HALF_CIRCLE) {
    deltaYaw += FULL_CIRCLE;
  }

  return deltaYaw;
};
