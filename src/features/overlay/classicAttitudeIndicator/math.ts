import { CONST } from './constants';

export const getCenter = (size: number): number => size / CONST.HALF;
export const getRadius = (size: number): number => getCenter(size) - size * CONST.RAD_OFF;
export const getArcRadius = (size: number): number => getRadius(size) - size * CONST.RAD_OFF;
export const getPitchScale = (size: number): number => size / CONST.P_SCALE;
export const getTextSize = (size: number, ratio: number): string => `${size * ratio}px`;

export const getDeltaYaw = (desiredYaw: number, yaw: number): number =>
  ((desiredYaw - yaw + CONST.YAW_OFF) % CONST.YAW_MOD) - CONST.YAW_SUB;

export const getPitchLines = (): number[] => {
  const lines: number[] = [];
  for (let index = Number(CONST.P_MIN); index <= CONST.P_MAX; index += CONST.P_STEP) {
    if (index !== 0) {
      lines.push(index);
    }
  }
  return lines;
};
