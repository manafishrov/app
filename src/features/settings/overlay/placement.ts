/**
 * Pointer-to-grid math for the overlay layout editor. Pure so the drag
 * behaviour can be tested without a DOM.
 */

export type GridCell = { column: number; row: number };

export type CanvasRect = { left: number; top: number; width: number; height: number };

export type GridSize = { columns: number; rows: number };

export type GridSpan = { columnSpan: number; rowSpan: number };

export type PointerPosition = {
  rect: CanvasRect;
  clientX: number;
  clientY: number;
  grid: GridSize;
};

export type DragState = GridSpan & {
  widgetId: string;
  /** Which cell inside the widget was grabbed, so it does not jump on grab. */
  grabColumnOffset: number;
  grabRowOffset: number;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** 1-based grid cell under a pointer position, clamped to the grid. */
export const cellFromPoint = (position: PointerPosition): GridCell => {
  const { rect, grid } = position;

  if (rect.width <= 0 || rect.height <= 0) {
    return { column: 1, row: 1 };
  }

  const column = Math.floor(((position.clientX - rect.left) / rect.width) * grid.columns) + 1;
  const row = Math.floor(((position.clientY - rect.top) / rect.height) * grid.rows) + 1;

  return {
    column: clamp(column, 1, grid.columns),
    row: clamp(row, 1, grid.rows),
  };
};

/** Keep a widget rectangle of this size fully inside the grid. */
export const clampCell = (cell: GridCell, span: GridSpan, grid: GridSize): GridCell => ({
  column: clamp(cell.column, 1, Math.max(1, grid.columns - span.columnSpan + 1)),
  row: clamp(cell.row, 1, Math.max(1, grid.rows - span.rowSpan + 1)),
});

/**
 * Where the dragged widget's anchor cell should go for the current pointer
 * position, preserving the grab offset.
 */
export const dragTargetCell = (drag: DragState, position: PointerPosition): GridCell => {
  const pointer = cellFromPoint(position);

  return clampCell(
    {
      column: pointer.column - drag.grabColumnOffset,
      row: pointer.row - drag.grabRowOffset,
    },
    drag,
    position.grid,
  );
};

/** Grab offset captured on pointer down, in cells from the widget's anchor. */
export const grabOffset = (
  position: PointerPosition,
  widget: GridCell,
): { grabColumnOffset: number; grabRowOffset: number } => {
  const pointer = cellFromPoint(position);

  return {
    grabColumnOffset: pointer.column - widget.column,
    grabRowOffset: pointer.row - widget.row,
  };
};
