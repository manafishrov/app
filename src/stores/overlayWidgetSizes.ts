import type { OverlayWidget, OverlayWidgetOptions, OverlayWidgetType } from './overlayTypes';

export type WidgetFootprint = { columns: number; rows: number };
type WidgetSizes = readonly [WidgetFootprint, ...WidgetFootprint[]];
type CapabilityDisplay = NonNullable<OverlayWidgetOptions['display']>;

/** Rows a single line of text occupies; readings and statuses start at this height. */
export const SINGLE_LINE_ROWS = 2;

/*
 * Each list starts with the base footprint: the smallest size, the default when
 * a widget is added, and the size its content is designed at.
 */
/* oxlint-disable no-magic-numbers -- supported widget footprints */
const reading = [
  { columns: 10, rows: 2 },
  { columns: 13, rows: 3 },
  { columns: 16, rows: 4 },
] as const;
const status = [
  { columns: 8, rows: 2 },
  { columns: 10, rows: 3 },
  { columns: 12, rows: 4 },
] as const;
const control = [
  { columns: 3, rows: 3 },
  { columns: 4, rows: 4 },
  { columns: 6, rows: 6 },
  { columns: 8, rows: 8 },
] as const;
const attitude = [
  { columns: 10, rows: 10 },
  { columns: 12, rows: 12 },
  { columns: 14, rows: 14 },
  { columns: 16, rows: 16 },
  { columns: 20, rows: 20 },
  { columns: 24, rows: 24 },
] as const;
const capabilityText = [
  { columns: 8, rows: 4 },
  { columns: 12, rows: 4 },
  { columns: 16, rows: 6 },
] as const;
const capabilityLight = [
  { columns: 4, rows: 4 },
  { columns: 6, rows: 6 },
  { columns: 8, rows: 8 },
] as const;

/** Capability widgets take the shape of how they display their source. */
const capabilityDisplaySizes: Record<CapabilityDisplay, WidgetSizes> = {
  text: capabilityText,
  badge: [
    { columns: 8, rows: 4 },
    { columns: 12, rows: 4 },
    { columns: 8, rows: 8 },
  ],
  status: capabilityLight,
  warningYellow: capabilityLight,
  warningRed: capabilityLight,
  ping: capabilityLight,
  bar: [
    { columns: 12, rows: 4 },
    { columns: 16, rows: 4 },
    { columns: 20, rows: 6 },
  ],
  verticalBar: [
    { columns: 4, rows: 8 },
    { columns: 4, rows: 12 },
    { columns: 6, rows: 16 },
  ],
  button: [
    { columns: 8, rows: 4 },
    { columns: 12, rows: 4 },
    { columns: 8, rows: 8 },
  ],
};

export const overlayWidgetSizes: Record<OverlayWidgetType, WidgetSizes> = {
  capability: capabilityText,
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
const sizesByDisplay = new Map<string, readonly WidgetFootprint[]>(
  Object.entries(capabilityDisplaySizes),
);

const [undef] = [] as undefined[];

/** Footprints a widget may take; capability widgets depend on their display. */
export const getWidgetSizes = (
  widget: Pick<OverlayWidget, 'type'> & { options?: OverlayWidgetOptions },
): readonly WidgetFootprint[] => {
  const display =
    widget.type === 'capability' && widget.options !== undef ? widget.options.display : undef;
  const byDisplay = display === undef ? undef : sizesByDisplay.get(display);
  return byDisplay ?? sizesByType.get(widget.type) ?? [];
};
