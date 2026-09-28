/**
 * Overlay layout data model.
 *
 * The camera feed is locked to a fixed aspect ratio, so the overlay can be
 * described as a resolution-independent grid laid over it. A layout is just a
 * list of placed widgets; nothing is toggled on or off, a widget is visible if
 * and only if it is placed.
 *
 * Widget *rendering* lives in `@/features/overlay/widgets`. This module only
 * owns the persisted shape so the store stays free of feature imports.
 */

/** Columns and rows the overlay grid is divided into. */
export const OVERLAY_GRID_COLUMNS = 32;
export const OVERLAY_GRID_ROWS = 24;

export const OverlayWidgetType = {
  capability: 'capability',
  connectionStatus: 'connectionStatus',
  recording: 'recording',
  workIndicator: 'workIndicator',
  attitudeScientific: 'attitudeScientific',
  attitudeModel3D: 'attitudeModel3D',
  attitudeClassic: 'attitudeClassic',
  thrusterRpm1: 'thrusterRpm1',
  thrusterRpm2: 'thrusterRpm2',
  thrusterRpm3: 'thrusterRpm3',
  thrusterRpm4: 'thrusterRpm4',
  thrusterRpm5: 'thrusterRpm5',
  thrusterRpm6: 'thrusterRpm6',
  thrusterRpm7: 'thrusterRpm7',
  thrusterRpm8: 'thrusterRpm8',
  autoStabilization: 'autoStabilization',
  depthHold: 'depthHold',
  currentDepth: 'currentDepth',
  desiredDepth: 'desiredDepth',
  waterTemperature: 'waterTemperature',
  electronicsTemperature: 'electronicsTemperature',
  batteryLevel: 'batteryLevel',
  currentDraw: 'currentDraw',
} as const;

export type OverlayWidgetType = (typeof OverlayWidgetType)[keyof typeof OverlayWidgetType];

/** Position an instrument within its cells while preserving its proportions. */
export const OverlayAnchor = {
  topLeft: 'topLeft',
  top: 'top',
  topRight: 'topRight',
  left: 'left',
  center: 'center',
  right: 'right',
  bottomLeft: 'bottomLeft',
  bottom: 'bottom',
  bottomRight: 'bottomRight',
} as const;

export type OverlayAnchor = (typeof OverlayAnchor)[keyof typeof OverlayAnchor];

/**
 * Per-instance widget settings. Every field is optional so a widget type can
 * ignore the ones that do not apply to it, and so new options never invalidate
 * a stored layout.
 */
export type OverlayWidgetOptions = {
  /** Legacy glow preference, converted into a standalone work widget. */
  workIndicator?: boolean;
  sourceId?: string;
  sourceKind?: 'reading' | 'action';
  label?: string;
  display?:
    | 'text'
    | 'badge'
    | 'status'
    | 'warningYellow'
    | 'warningRed'
    | 'ping'
    | 'bar'
    | 'verticalBar'
    | 'button';
  minimum?: number;
  maximum?: number;
  decaySeconds?: number;
};

export type OverlayWidget = {
  /** Stable instance id, so the same type can be placed more than once. */
  id: string;
  type: OverlayWidgetType | 'stabilization' | 'depth' | 'temperature' | 'battery' | 'thrusterRpm';
  /** 1-based grid anchor cell. */
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  anchor: OverlayAnchor;
  options: OverlayWidgetOptions;
};

export type OverlayLayout = {
  id: string;
  name: string;
  /**
   * Grid resolution this layout was authored against. Stored per layout so a
   * future change to `OVERLAY_GRID_COLUMNS`/`OVERLAY_GRID_ROWS` can rescale
   * existing placements instead of scrambling them.
   */
  columns: number;
  rows: number;
  widgets: OverlayWidget[];
};

export type OverlayConfig = {
  activeLayoutId: string;
  layouts: OverlayLayout[];
};
