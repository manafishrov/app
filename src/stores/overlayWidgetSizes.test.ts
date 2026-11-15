/* oxlint-disable no-magic-numbers -- widget footprint fixtures */
import { expect, it, vi } from 'vitest';

import { receiveCapabilityCatalog } from './capabilities';
import { normaliseLayout } from './overlayLayout';
import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  OverlayWidgetType,
  type OverlayLayout,
  type OverlayWidget,
} from './overlayTypes';
import { fitWidgetSize, getWidgetSizes, overlayWidgetSizes } from './overlayWidgetSizes';

vi.mock('@/lib/log', () => ({ logWarn: vi.fn() }));

const widget = (type: OverlayWidgetType): OverlayWidget => ({
  id: 'sized',
  type,
  column: 1,
  row: 1,
  columnSpan: 12,
  rowSpan: 4,
  anchor: OverlayAnchor.topLeft,
  options: {},
});
const layout = (widgets: OverlayWidget[]): OverlayLayout => ({
  id: 'custom',
  name: 'My dive',
  columns: OVERLAY_GRID_COLUMNS,
  rows: OVERLAY_GRID_ROWS,
  widgets,
});

it('preserves every offered widget size on reload', () => {
  for (const type of Object.values(OverlayWidgetType)) {
    for (const { columns, rows } of overlayWidgetSizes[type]) {
      const saved = layout([{ ...widget(type), columnSpan: columns, rowSpan: rows }]);
      expect(normaliseLayout(saved)).toEqual(saved);
    }
  }
});

const capability = (display: NonNullable<OverlayWidget['options']['display']>): OverlayWidget => ({
  ...widget(OverlayWidgetType.capability),
  options: { display },
});

it('shapes capability widgets after their display', () => {
  for (const { columns, rows } of getWidgetSizes(capability('verticalBar'))) {
    expect(rows).toBeGreaterThan(columns);
  }
  for (const { columns, rows } of getWidgetSizes(capability('status'))) {
    expect(columns).toBeGreaterThan(rows);
  }
  expect(fitWidgetSize(capability('text'))).toMatchObject({ columnSpan: 13, rowSpan: 3 });
  expect(fitWidgetSize(capability('verticalBar'))).toMatchObject({ columnSpan: 4, rowSpan: 8 });
  expect(fitWidgetSize(capability('status'))).toMatchObject({ columnSpan: 12, rowSpan: 2 });
});

it('moves a re-fitted widget aside instead of overlapping its neighbour', () => {
  const saved = layout([
    { ...capability('text'), id: 'upper', row: 1 },
    { ...capability('verticalBar'), id: 'lower', row: 5, columnSpan: 4, rowSpan: 8 },
  ]);
  const changed = structuredClone(saved);
  for (const value of changed.widgets) {
    value.options = { display: 'verticalBar' };
  }
  const fitted = normaliseLayout(changed);
  expect(fitted.widgets).toMatchObject([
    { id: 'upper', column: 5, row: 1, columnSpan: 4, rowSpan: 8 },
    { id: 'lower', column: 1, row: 5, columnSpan: 4, rowSpan: 8 },
  ]);
  expect(normaliseLayout(fitted)).toEqual(fitted);
});

it('offers number lists shown as text only the line that fits every value', () => {
  receiveCapabilityCatalog({
    version: 1,
    readings: [
      {
        id: 'rov.thrusterRpms',
        name: 'Thruster speeds',
        valueType: 'numberArray',
        customActionId: null,
      },
      { id: 'rov.depth', name: 'Depth', valueType: 'number', customActionId: null },
    ],
    actions: [],
    customActions: [],
  });
  const source = (sourceId: string): OverlayWidget => ({
    ...capability('text'),
    options: { sourceId, sourceKind: 'reading', display: 'text' },
  });

  expect(getWidgetSizes(source('rov.thrusterRpms'))).toEqual([{ columns: 48, rows: 2 }]);
  expect(fitWidgetSize(source('rov.thrusterRpms'))).toMatchObject({ columnSpan: 48, rowSpan: 2 });
  expect(getWidgetSizes(source('rov.depth'))).toEqual(getWidgetSizes(capability('text')));
  expect(getWidgetSizes(source('rov.depth'))).toContainEqual({ columns: 10, rows: 2 });
});
