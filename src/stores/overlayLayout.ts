/**
 * Pure operations over an overlay layout.
 *
 * Kept free of any Solid or feature imports so the editor can apply them to a
 * local draft and the config store can persist the result unchanged.
 */

import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OVERLAY_MAX_SCALE,
  OVERLAY_MIN_SCALE,
  OVERLAY_REFERENCE_WIDTH,
  type OverlayConfig,
  type OverlayLayout,
  type OverlayWidget,
  type OverlayWidgetType,
} from '@/stores/overlayTypes';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Scale factor that ties overlay size to camera size. Widgets keep their
 * natural rem-based dimensions and are zoomed by this, so the overlay is always
 * the same fraction of the feed regardless of window size.
 */
export const overlayScaleForWidth = (cameraWidth: number): number =>
  clamp(cameraWidth / OVERLAY_REFERENCE_WIDTH, OVERLAY_MIN_SCALE, OVERLAY_MAX_SCALE);

export const getActiveLayout = (overlay: OverlayConfig): OverlayLayout | undefined =>
  overlay.layouts.find((layout) => layout.id === overlay.activeLayoutId) ?? overlay.layouts[0];

/** Keep a widget's rectangle fully inside the grid. */
export const clampWidget = (widget: OverlayWidget, layout: OverlayLayout): OverlayWidget => {
  const columnSpan = clamp(widget.columnSpan, 1, layout.columns);
  const rowSpan = clamp(widget.rowSpan, 1, layout.rows);

  return {
    ...widget,
    columnSpan,
    rowSpan,
    column: clamp(widget.column, 1, layout.columns - columnSpan + 1),
    row: clamp(widget.row, 1, layout.rows - rowSpan + 1),
  };
};

const mapWidget = (
  layout: OverlayLayout,
  widgetId: string,
  transform: (widget: OverlayWidget) => OverlayWidget,
): OverlayLayout => ({
  ...layout,
  widgets: layout.widgets.map((widget) =>
    widget.id === widgetId ? clampWidget(transform(widget), layout) : widget,
  ),
});

export type GridCell = { column: number; row: number };
export type GridSpan = { columnSpan: number; rowSpan: number };

export const moveWidget = (
  layout: OverlayLayout,
  widgetId: string,
  cell: GridCell,
): OverlayLayout => mapWidget(layout, widgetId, (widget) => ({ ...widget, ...cell }));

export const resizeWidget = (
  layout: OverlayLayout,
  widgetId: string,
  span: GridSpan,
): OverlayLayout => mapWidget(layout, widgetId, (widget) => ({ ...widget, ...span }));

export const updateWidget = (
  layout: OverlayLayout,
  widgetId: string,
  patch: Partial<Omit<OverlayWidget, 'id' | 'type'>>,
): OverlayLayout => mapWidget(layout, widgetId, (widget) => ({ ...widget, ...patch }));

export const removeWidget = (layout: OverlayLayout, widgetId: string): OverlayLayout => ({
  ...layout,
  widgets: layout.widgets.filter((widget) => widget.id !== widgetId),
});

/** Unique instance id, so the same widget type can be placed more than once. */
export const createWidgetId = (type: OverlayWidgetType, layout: OverlayLayout): string => {
  const taken = new Set(layout.widgets.map((widget) => widget.id));
  if (!taken.has(type)) {
    return type;
  }

  let suffix = 2;
  while (taken.has(`${type}-${suffix}`)) {
    suffix += 1;
  }
  return `${type}-${suffix}`;
};

type GridRect = Pick<OverlayWidget, 'column' | 'row' | 'columnSpan' | 'rowSpan'>;

const overlaps = (first: GridRect, second: GridRect): boolean =>
  first.column < second.column + second.columnSpan &&
  second.column < first.column + first.columnSpan &&
  first.row < second.row + second.rowSpan &&
  second.row < first.row + first.rowSpan;

/**
 * First cell, scanning row by row, where the widget would not overlap anything
 * already placed. Falls back to the top-left corner when the grid is full;
 * overlap is allowed, so this is a convenience, not a constraint.
 */
export const findFreeCell = (layout: OverlayLayout, span: GridSpan): GridCell => {
  const { columnSpan, rowSpan } = span;

  for (let row = 1; row <= layout.rows - rowSpan + 1; row += 1) {
    for (let column = 1; column <= layout.columns - columnSpan + 1; column += 1) {
      const candidate: GridRect = { column, row, columnSpan, rowSpan };
      if (!layout.widgets.some((widget) => overlaps(candidate, widget))) {
        return { column, row };
      }
    }
  }
  return { column: 1, row: 1 };
};

export const addWidget = (layout: OverlayLayout, widget: OverlayWidget): OverlayLayout => ({
  ...layout,
  widgets: [...layout.widgets, clampWidget(widget, layout)],
});

export const replaceLayout = (overlay: OverlayConfig, layout: OverlayLayout): OverlayConfig => ({
  ...overlay,
  layouts: overlay.layouts.map((existing) => (existing.id === layout.id ? layout : existing)),
});

/**
 * Rescale placements when a layout was authored against a different grid
 * resolution than this build uses, so stored layouts survive a constant change.
 */
export const normaliseLayout = (layout: OverlayLayout): OverlayLayout => {
  if (layout.columns === OVERLAY_GRID_COLUMNS && layout.rows === OVERLAY_GRID_ROWS) {
    return layout;
  }

  const columnRatio = OVERLAY_GRID_COLUMNS / layout.columns;
  const rowRatio = OVERLAY_GRID_ROWS / layout.rows;

  const rescaled: OverlayLayout = {
    ...layout,
    columns: OVERLAY_GRID_COLUMNS,
    rows: OVERLAY_GRID_ROWS,
    widgets: layout.widgets.map((widget) => ({
      ...widget,
      column: Math.round((widget.column - 1) * columnRatio) + 1,
      row: Math.round((widget.row - 1) * rowRatio) + 1,
      columnSpan: Math.max(1, Math.round(widget.columnSpan * columnRatio)),
      rowSpan: Math.max(1, Math.round(widget.rowSpan * rowRatio)),
    })),
  };

  return {
    ...rescaled,
    widgets: rescaled.widgets.map((widget) => clampWidget(widget, rescaled)),
  };
};
