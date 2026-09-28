import type { OverlayWidgetType } from './overlayTypes';

export type WidgetFootprint = { columns: number; rows: number };

/* oxlint-disable no-magic-numbers -- supported widget footprints */
const reading = [
  { columns: 5, rows: 1 },
  { columns: 8, rows: 2 },
] as const;
const status = [
  { columns: 4, rows: 1 },
  { columns: 6, rows: 2 },
] as const;
const control = [
  { columns: 3, rows: 3 },
  { columns: 2, rows: 2 },
  { columns: 4, rows: 4 },
  { columns: 5, rows: 5 },
] as const;
const attitude = [
  { columns: 5, rows: 5 },
  { columns: 6, rows: 6 },
  { columns: 7, rows: 7 },
  { columns: 8, rows: 8 },
  { columns: 9, rows: 9 },
  { columns: 10, rows: 10 },
  { columns: 11, rows: 11 },
  { columns: 12, rows: 12 },
] as const;

export const overlayWidgetSizes: Record<
  OverlayWidgetType,
  readonly [WidgetFootprint, ...WidgetFootprint[]]
> = {
  capability: [
    { columns: 6, rows: 2 },
    { columns: 8, rows: 3 },
    { columns: 4, rows: 4 },
    { columns: 6, rows: 6 },
  ],
  connectionStatus: status,
  recording: status,
  workIndicator: status,
  attitudeScientific: attitude,
  attitudeClassic: attitude,
  attitudeModel3D: attitude,
  thrusterRpm1: reading,
  thrusterRpm2: reading,
  thrusterRpm3: reading,
  thrusterRpm4: reading,
  thrusterRpm5: reading,
  thrusterRpm6: reading,
  thrusterRpm7: reading,
  thrusterRpm8: reading,
  autoStabilization: control,
  depthHold: control,
  currentDepth: reading,
  desiredDepth: reading,
  waterTemperature: reading,
  electronicsTemperature: reading,
  batteryLevel: reading,
  currentDraw: reading,
};
/* oxlint-enable no-magic-numbers */

const sizesByType = new Map<string, readonly WidgetFootprint[]>(Object.entries(overlayWidgetSizes));
export const getWidgetSizes = (type: string): readonly WidgetFootprint[] =>
  sizesByType.get(type) ?? [];
