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
export const OVERLAY_GRID_COLUMNS = 12;
export const OVERLAY_GRID_ROWS = 9;

/**
 * Camera width, in CSS pixels, at which widgets render at their natural size.
 * Anything wider or narrower scales proportionally, which is what ties overlay
 * size to camera size.
 *
 * Chosen so one grid cell is exactly 90px: on a maximised 1080p window the
 * resulting scale (~1.28) and the 2x2 attitude indicator (180px) match what the
 * old fixed defaults produced, so upgrading looks unchanged.
 */
export const OVERLAY_REFERENCE_WIDTH = 1080;

/**
 * Side of one grid cell at reference width. Cells are square: 12 columns by 9
 * rows over a 4:3 feed gives width/12 both ways.
 */
export const OVERLAY_REFERENCE_CELL = OVERLAY_REFERENCE_WIDTH / OVERLAY_GRID_COLUMNS;

/** Guard rails so an extreme window size cannot make the overlay unusable. */
export const OVERLAY_MIN_SCALE = 0.4;
export const OVERLAY_MAX_SCALE = 3;

export const OverlayWidgetType = {
  connectionStatus: 'connectionStatus',
  recording: 'recording',
  attitudeScientific: 'attitudeScientific',
  attitudeModel3D: 'attitudeModel3D',
  attitudeClassic: 'attitudeClassic',
  stabilization: 'stabilization',
  thrusterRpm: 'thrusterRpm',
  depth: 'depth',
  temperature: 'temperature',
  battery: 'battery',
} as const;

export type OverlayWidgetType = (typeof OverlayWidgetType)[keyof typeof OverlayWidgetType];

/**
 * Where a widget's content sits inside the grid rectangle it occupies. Content
 * keeps its natural size, so the anchor decides which way it grows when the
 * rectangle is larger than the content.
 */
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
  /** Attitude widgets: tint a glow around the horizon by regulator workload. */
  workIndicator?: boolean;
};

export type OverlayWidget = {
  /** Stable instance id, so the same type can be placed more than once. */
  id: string;
  type: OverlayWidgetType;
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
