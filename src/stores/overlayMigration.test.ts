/* oxlint-disable no-magic-numbers -- legacy saved layout fixtures */
import { expect, it } from 'vitest';

import { normaliseLayout } from './overlayLayout';
import { fitWidgetSize } from './overlayMigration';
import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  OverlayWidgetType,
  type OverlayLayout,
  type OverlayWidget,
} from './overlayTypes';
import { getWidgetSizes, overlayWidgetSizes } from './overlayWidgetSizes';

const ORIGIN = { column: 1, row: 1 };

const oldWidget = (id: string, type: OverlayWidget['type'], position = ORIGIN): OverlayWidget => ({
  id,
  type,
  ...position,
  columnSpan: 2,
  rowSpan: 1,
  anchor: OverlayAnchor.topLeft,
  options: {},
});
const oldLayout = (widgets: OverlayWidget[]): OverlayLayout => ({
  id: 'custom',
  name: 'My dive',
  columns: 12,
  rows: 9,
  widgets,
});

it('splits all four old groups without losing readings or actions', () => {
  const result = normaliseLayout(
    oldLayout([
      oldWidget('s', 'stabilization', { column: 1, row: 5 }),
      oldWidget('d', 'depth', { column: 7, row: 9 }),
      oldWidget('t', 'temperature', { column: 9, row: 9 }),
      oldWidget('b', 'battery', { column: 11, row: 9 }),
    ]),
  );
  expect(result.widgets.map(({ type }) => type)).toEqual([
    'autoStabilization',
    'depthHold',
    'currentDepth',
    'desiredDepth',
    'waterTemperature',
    'electronicsTemperature',
    'currentDraw',
    'batteryLevel',
  ]);
  expect(result.widgets.find(({ id }) => id === 'd')).toMatchObject({
    column: 33,
    row: 44,
    columnSpan: 10,
    rowSpan: 2,
  });
  expect(result.widgets.find(({ type }) => type === 'desiredDepth')).toMatchObject({
    column: 33,
    row: 46,
  });
  expect(normaliseLayout(result)).toEqual(result);
});
it('preserves the attitude while moving its glow preference to a separate widget', () => {
  const indicator = {
    ...oldWidget('attitude', 'attitudeModel3D', { column: 2, row: 4 }),
    columnSpan: 3,
    rowSpan: 3,
    options: { workIndicator: true },
  };
  expect(normaliseLayout(oldLayout([indicator])).widgets[0]).toMatchObject({
    id: 'attitude',
    type: 'attitudeModel3D',
    column: 6,
    row: 17,
    columnSpan: 16,
    rowSpan: 16,
    options: {},
  });
});
it('avoids id collisions with existing custom widgets', () => {
  const result = normaliseLayout(
    oldLayout([oldWidget('d', 'depth'), oldWidget('d-desiredDepth', 'recording')]),
  );
  expect(new Set(result.widgets.map(({ id }) => id)).size).toBe(3);
});
it('keeps split controls distinct at the right edge', () => {
  const result = normaliseLayout(
    oldLayout([{ ...oldWidget('s', 'stabilization', { column: 12, row: 9 }), columnSpan: 1 }]),
  );
  expect(result.widgets.map(({ column }) => column)).toEqual([57, 61]);
  for (const widget of result.widgets) {
    expect(widget.column + widget.columnSpan - 1).toBeLessThanOrEqual(OVERLAY_GRID_COLUMNS);
    expect(widget.row + widget.rowSpan - 1).toBeLessThanOrEqual(OVERLAY_GRID_ROWS);
  }
});
it('keeps removed widgets absent on subsequent saves', () => {
  const migrated = normaliseLayout(oldLayout([oldWidget('d', 'depth')]));
  migrated.widgets = migrated.widgets.filter(({ type }) => type !== 'desiredDepth');
  expect(normaliseLayout(migrated).widgets.map(({ type }) => type)).toEqual(['currentDepth']);
});

/** Each widget sits directly below the previous one, without overlapping or leaving the grid. */
const expectStackedInsideGrid = (widgets: OverlayWidget[]): void => {
  const [firstRow = 0] = widgets.map(({ row }) => row);
  for (const [index, widget] of widgets.entries()) {
    expect(widget.row).toBe(firstRow + index * widget.rowSpan);
    expect(widget.row + widget.rowSpan - 1).toBeLessThanOrEqual(OVERLAY_GRID_ROWS);
  }
};

it('splits an RPM stack into eight independent channels without recreating removed channels', () => {
  const saved = {
    ...oldLayout([
      { ...oldWidget('rpm', 'thrusterRpm'), column: 21, row: 16, columnSpan: 4, rowSpan: 3 },
    ]),
    columns: 24,
    rows: 18,
  };
  const migrated = normaliseLayout(saved);
  expect(migrated.widgets.map(({ type }) => type)).toEqual([
    'thrusterRpm1',
    'thrusterRpm2',
    'thrusterRpm3',
    'thrusterRpm4',
    'thrusterRpm5',
    'thrusterRpm6',
    'thrusterRpm7',
    'thrusterRpm8',
  ]);
  expectStackedInsideGrid(migrated.widgets);
  expect(normaliseLayout(migrated)).toEqual(migrated);
  migrated.widgets.splice(2, 1);
  expect(normaliseLayout(migrated).widgets.some(({ type }) => type === 'thrusterRpm3')).toBe(false);
});

it('converts enabled attitude glow once and allows the work widget to be removed', () => {
  const saved = oldLayout([
    { ...oldWidget('attitude', 'attitudeClassic'), options: { workIndicator: true } },
  ]);
  const migrated = normaliseLayout(saved);
  expect(migrated.widgets.map(({ type }) => type)).toEqual(['attitudeClassic', 'workIndicator']);
  expect(migrated.widgets.at(0)).toMatchObject({ options: {} });
  expect(migrated.widgets).toMatchObject([{ row: 1, rowSpan: 10 }, { row: 11 }]);
  expect(normaliseLayout(migrated)).toEqual(migrated);
  migrated.widgets.pop();
  expect(normaliseLayout(migrated).widgets).toHaveLength(1);
});

it('preserves every offered widget size on reload', () => {
  for (const type of Object.values(OverlayWidgetType)) {
    for (const { columns, rows } of overlayWidgetSizes[type]) {
      const saved = {
        ...oldLayout([
          {
            ...oldWidget('sized', type),
            columnSpan: columns,
            rowSpan: rows,
          },
        ]),
        columns: OVERLAY_GRID_COLUMNS,
        rows: OVERLAY_GRID_ROWS,
      };
      expect(normaliseLayout(saved)).toEqual(saved);
    }
  }
});

const capability = (display: NonNullable<OverlayWidget['options']['display']>): OverlayWidget => ({
  ...oldWidget('pressure', 'capability'),
  columnSpan: 12,
  rowSpan: 4,
  options: { display },
});

it('shapes capability widgets after their display', () => {
  for (const { columns, rows } of getWidgetSizes(capability('verticalBar'))) {
    expect(rows).toBeGreaterThan(columns);
  }
  for (const { columns, rows } of getWidgetSizes(capability('status'))) {
    expect(rows).toBeLessThan(columns);
  }
  // Switching display re-fits the footprint to the closest size of the new shape.
  expect(fitWidgetSize(capability('text'))).toMatchObject({ columnSpan: 13, rowSpan: 3 });
  expect(fitWidgetSize(capability('verticalBar'))).toMatchObject({ columnSpan: 4, rowSpan: 8 });
  expect(fitWidgetSize(capability('status'))).toMatchObject({ columnSpan: 12, rowSpan: 2 });
});

const verticalBar = (id: string, row: number): OverlayWidget => ({
  ...capability('verticalBar'),
  id,
  row,
  columnSpan: 6,
  rowSpan: 2,
});

const expectDisjoint = (widgets: OverlayWidget[]): void => {
  for (const [index, first] of widgets.entries()) {
    for (const second of widgets.slice(index + 1)) {
      expect(
        first.column >= second.column + second.columnSpan ||
          second.column >= first.column + first.columnSpan ||
          first.row >= second.row + second.rowSpan ||
          second.row >= first.row + first.rowSpan,
      ).toBe(true);
    }
  }
};

it('moves a re-fitted widget aside instead of overlapping its neighbour', () => {
  // Landscape bars saved one above the other become portrait when re-fitted.
  const saved = {
    ...oldLayout([verticalBar('upper', 1), verticalBar('lower', 3)]),
    columns: 32,
    rows: 24,
  };
  const migrated = normaliseLayout(saved);
  expect(migrated.widgets).toMatchObject([
    { id: 'upper', columnSpan: 4, rowSpan: 8 },
    { id: 'lower', column: 1, row: 5, columnSpan: 4, rowSpan: 8 },
  ]);
  expectDisjoint(migrated.widgets);
  expect(normaliseLayout(migrated)).toEqual(migrated);
});
