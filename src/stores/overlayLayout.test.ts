/* oxlint-disable no-magic-numbers -- Grid coordinates read clearer inline. */
import { describe, expect, it } from 'vitest';

import {
  addWidget,
  clampWidget,
  createWidgetId,
  findFreeCell,
  getActiveLayout,
  moveWidget,
  normaliseLayout,
  removeWidget,
  replaceLayout,
  resizeWidget,
  updateWidget,
} from './overlayLayout';
import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  OverlayWidgetType,
  type OverlayLayout,
  type OverlayWidget,
} from './overlayTypes';

const widget = (overrides: Partial<OverlayWidget> = {}): OverlayWidget => ({
  id: 'battery',
  type: OverlayWidgetType.batteryLevel,
  column: 1,
  row: 1,
  columnSpan: 2,
  rowSpan: 1,
  anchor: OverlayAnchor.topLeft,
  options: {},
  ...overrides,
});

const layout = (widgets: OverlayWidget[]): OverlayLayout => ({
  id: 'default',
  name: 'Default',
  columns: OVERLAY_GRID_COLUMNS,
  rows: OVERLAY_GRID_ROWS,
  widgets,
});

describe('clampWidget', () => {
  it('pulls a widget back inside the grid', () => {
    const clamped = clampWidget(
      widget({ column: OVERLAY_GRID_COLUMNS, row: OVERLAY_GRID_ROWS, columnSpan: 3, rowSpan: 3 }),
      layout([]),
    );

    expect(clamped).toMatchObject({
      column: OVERLAY_GRID_COLUMNS - 2,
      row: OVERLAY_GRID_ROWS - 2,
    });
  });

  it('never allows a zero or negative span', () => {
    expect(clampWidget(widget({ columnSpan: 0, rowSpan: -5 }), layout([]))).toMatchObject({
      columnSpan: 1,
      rowSpan: 1,
    });
  });
});

describe('moveWidget', () => {
  it('moves only the targeted widget', () => {
    const moved = moveWidget(layout([widget(), widget({ id: 'depth' })]), 'depth', {
      column: 5,
      row: 4,
    });

    expect(moved.widgets[0]).toMatchObject({ id: 'battery', column: 1 });
    expect(moved.widgets[1]).toMatchObject({ id: 'depth', column: 5, row: 4 });
  });

  it('clamps a move that would leave the grid', () => {
    const moved = moveWidget(layout([widget()]), 'battery', { column: 999, row: 999 });

    expect(moved.widgets[0]).toMatchObject({
      column: OVERLAY_GRID_COLUMNS - 1,
      row: OVERLAY_GRID_ROWS,
    });
  });
});

describe('resizeWidget and updateWidget', () => {
  it('resizes and re-clamps against the grid edge', () => {
    const resized = resizeWidget(
      layout([widget({ column: OVERLAY_GRID_COLUMNS - 1 })]),
      'battery',
      {
        columnSpan: 4,
        rowSpan: 1,
      },
    );

    expect(resized.widgets[0]).toMatchObject({
      columnSpan: 4,
      column: OVERLAY_GRID_COLUMNS - 3,
    });
  });

  it('patches options without touching placement', () => {
    const updated = updateWidget(layout([widget()]), 'battery', {
      options: { label: 'Dive battery' },
    });

    expect(updated.widgets[0]).toMatchObject({ options: { label: 'Dive battery' }, column: 1 });
  });
});

describe('addWidget and removeWidget', () => {
  it('adds and removes by id', () => {
    const added = addWidget(layout([widget()]), widget({ id: 'depth' }));
    expect(added.widgets).toHaveLength(2);

    const removed = removeWidget(added, 'battery');
    expect(removed.widgets).toHaveLength(1);
    expect(removed.widgets[0]).toMatchObject({ id: 'depth' });
  });
});

describe('createWidgetId', () => {
  it('uses the bare type when it is free', () => {
    expect(createWidgetId(OverlayWidgetType.currentDepth, layout([]))).toBe('currentDepth');
  });

  it('suffixes so a type can be placed more than once', () => {
    const existing = layout([widget({ id: 'currentDepth' }), widget({ id: 'currentDepth-2' })]);
    expect(createWidgetId(OverlayWidgetType.currentDepth, existing)).toBe('currentDepth-3');
  });
});

describe('findFreeCell', () => {
  it('returns the first cell on an empty grid', () => {
    expect(findFreeCell(layout([]), { columnSpan: 2, rowSpan: 1 })).toEqual({ column: 1, row: 1 });
  });

  it('skips past an occupied region', () => {
    const occupied = layout([widget({ column: 1, row: 1, columnSpan: 2, rowSpan: 1 })]);
    expect(findFreeCell(occupied, { columnSpan: 2, rowSpan: 1 })).toEqual({ column: 3, row: 1 });
  });
});

describe('getActiveLayout', () => {
  it('falls back to the first layout when the active id is stale', () => {
    const only = layout([]);
    expect(getActiveLayout({ activeLayoutId: 'missing', layouts: [only] })).toBe(only);
  });

  it('returns undefined when there are no layouts at all', () => {
    expect(getActiveLayout({ activeLayoutId: 'default', layouts: [] })).toBeUndefined();
  });
});

describe('replaceLayout', () => {
  it('swaps the matching layout only', () => {
    const first = layout([]);
    const second = { ...layout([]), id: 'other' };
    const replacement = { ...first, name: 'Renamed' };

    const result = replaceLayout(
      { activeLayoutId: 'default', layouts: [first, second] },
      replacement,
    );

    expect(result.layouts[0]).toMatchObject({ name: 'Renamed' });
    expect(result.layouts[1]).toBe(second);
  });
});

describe('normaliseLayout', () => {
  it('leaves a layout authored against the current grid untouched', () => {
    const current = layout([widget({ columnSpan: 10, rowSpan: 2 })]);
    expect(normaliseLayout(current)).toEqual(current);
  });

  it('fits unsupported sizes and clamps placements inside the current grid', () => {
    const invalid = layout([widget({ column: 999, row: 999 })]);
    const result = normaliseLayout(invalid);
    expect(result.widgets).toMatchObject([{ column: 55, row: 47, columnSpan: 10, rowSpan: 2 }]);
    expect(normaliseLayout(result)).toEqual(result);
  });
});
