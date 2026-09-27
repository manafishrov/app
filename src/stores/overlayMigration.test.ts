/* oxlint-disable no-magic-numbers -- legacy saved layout fixtures */
import { expect, it } from 'vitest';

import { normaliseLayout } from './overlayLayout';
import {
  OverlayAnchor,
  OverlayWidgetType,
  type OverlayLayout,
  type OverlayWidget,
} from './overlayTypes';
import { overlayWidgetSizes } from './overlayWidgetSizes';

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
    column: 17,
    row: 22,
    columnSpan: 5,
    rowSpan: 1,
  });
  expect(result.widgets.find(({ type }) => type === 'desiredDepth')).toMatchObject({
    column: 17,
    row: 23,
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
    column: 4,
    row: 9,
    columnSpan: 8,
    rowSpan: 8,
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
  expect(result.widgets.map(({ column }) => column)).toEqual([27, 30]);
  for (const widget of result.widgets) {
    expect(widget.column + widget.columnSpan - 1).toBeLessThanOrEqual(32);
    expect(widget.row + widget.rowSpan - 1).toBeLessThanOrEqual(24);
  }
});
it('keeps removed widgets absent on subsequent saves', () => {
  const migrated = normaliseLayout(oldLayout([oldWidget('d', 'depth')]));
  migrated.widgets = migrated.widgets.filter(({ type }) => type !== 'desiredDepth');
  expect(normaliseLayout(migrated).widgets.map(({ type }) => type)).toEqual(['currentDepth']);
});

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
  expect(new Set(migrated.widgets.map(({ row }) => row)).size).toBe(8);
  expect(migrated.widgets.every(({ row }) => row <= 24)).toBe(true);
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
        columns: 32,
        rows: 24,
      };
      expect(normaliseLayout(saved)).toEqual(saved);
    }
  }
});
