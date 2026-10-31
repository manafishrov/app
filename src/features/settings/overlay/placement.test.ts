/* oxlint-disable no-magic-numbers -- Pixel and cell coordinates read clearer inline. */
import { describe, expect, it } from 'vitest';

import {
  cellFromPoint,
  clampCell,
  dragTargetCell,
  grabOffset,
  type CanvasRect,
  type PointerPosition,
} from './placement';

const GRID = { columns: 12, rows: 9 };
// 1200x900 makes each cell exactly 100px, so expectations read directly.
const RECT: CanvasRect = { left: 0, top: 0, width: 1200, height: 900 };

const at = (clientX: number, clientY: number, rect: CanvasRect = RECT): PointerPosition => ({
  rect,
  clientX,
  clientY,
  grid: GRID,
});

describe('cellFromPoint', () => {
  it('maps a point to its 1-based cell', () => {
    expect(cellFromPoint(at(0, 0))).toEqual({ column: 1, row: 1 });
    expect(cellFromPoint(at(250, 150))).toEqual({ column: 3, row: 2 });
  });

  it('accounts for the canvas offset', () => {
    const offset: CanvasRect = { left: 100, top: 50, width: 1200, height: 900 };
    expect(cellFromPoint(at(350, 200, offset))).toEqual({ column: 3, row: 2 });
  });

  it('clamps points outside the canvas', () => {
    expect(cellFromPoint(at(-500, -500))).toEqual({ column: 1, row: 1 });
    expect(cellFromPoint(at(99_999, 99_999))).toEqual({ column: 12, row: 9 });
  });

  it('does not divide by zero before layout', () => {
    const empty: CanvasRect = { left: 0, top: 0, width: 0, height: 0 };
    expect(cellFromPoint(at(10, 10, empty))).toEqual({ column: 1, row: 1 });
  });
});

describe('clampCell', () => {
  it('keeps a widget rectangle inside the grid', () => {
    expect(clampCell({ column: 12, row: 9 }, { columnSpan: 3, rowSpan: 3 }, GRID)).toEqual({
      column: 10,
      row: 7,
    });
  });

  it('leaves a rectangle that already fits', () => {
    expect(clampCell({ column: 4, row: 4 }, { columnSpan: 2, rowSpan: 2 }, GRID)).toEqual({
      column: 4,
      row: 4,
    });
  });

  it('survives a widget larger than the grid', () => {
    expect(clampCell({ column: 5, row: 5 }, { columnSpan: 99, rowSpan: 99 }, GRID)).toEqual({
      column: 1,
      row: 1,
    });
  });
});

describe('dragTargetCell', () => {
  it('preserves the grab offset so the widget does not jump', () => {
    // Grab the bottom-right cell of a 2x2 widget placed at column 3, row 2.
    const offset = grabOffset(at(350, 250), { column: 3, row: 2 });
    expect(offset).toEqual({ grabColumnOffset: 1, grabRowOffset: 1 });

    const drag = { widgetId: 'battery', columnSpan: 2, rowSpan: 2, ...offset };

    // Dragging that same cell one to the right moves the anchor one right.
    expect(dragTargetCell(drag, at(450, 250))).toEqual({ column: 4, row: 2 });
  });

  it('clamps the rectangle to the grid while dragging past the edge', () => {
    const drag = {
      widgetId: 'attitude',
      columnSpan: 3,
      rowSpan: 3,
      grabColumnOffset: 0,
      grabRowOffset: 0,
    };

    expect(dragTargetCell(drag, at(99_999, 99_999))).toEqual({ column: 10, row: 7 });
  });
});
