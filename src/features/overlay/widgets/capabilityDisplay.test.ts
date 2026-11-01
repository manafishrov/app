import { expect, it } from 'vitest';

import { normaliseLayout } from '@/stores/overlayLayout';
import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  type OverlayLayout,
} from '@/stores/overlayTypes';

import {
  compatibleReadingDisplay,
  formatReading,
  normalisedLevel,
  readingDisplays,
} from './capabilityDisplay';

/* oxlint-disable no-magic-numbers -- representative persisted grid and sensor values */
it('normalises numeric readings and handles invalid ranges without infinities', () => {
  expect(normalisedLevel(15, { minimum: 10, maximum: 20 })).toBe(0.5);
  expect(normalisedLevel(-5, {})).toBe(0);
  expect(normalisedLevel(15, {})).toBe(1);
  expect(normalisedLevel(1, { minimum: 2, maximum: 2 })).toBe(0);
  expect(normalisedLevel(Number.NaN, {})).toBe(0);
  expect(normalisedLevel('bad', {})).toBe(0);
  expect(normalisedLevel(1, { minimum: Number.NaN })).toBe(0);
  expect(normalisedLevel(1, { maximum: Number.POSITIVE_INFINITY })).toBe(0);
});
it('only offers renderers compatible with a reading type', () => {
  expect(readingDisplays('boolean')).toContain('ping');
  expect(readingDisplays('number')).toContain('bar');
  expect(readingDisplays('string')).not.toContain('bar');
});
it.each([4, 6, 8])('migrates a %i square light while preserving its unavailable source', (side) => {
  const layout: OverlayLayout = {
    id: 'test',
    name: 'Test',
    columns: OVERLAY_GRID_COLUMNS,
    rows: OVERLAY_GRID_ROWS,
    widgets: [
      {
        id: 'sensor',
        type: 'capability',
        column: 13,
        row: 17,
        columnSpan: side,
        rowSpan: side,
        anchor: OverlayAnchor.center,
        options: {
          sourceId: 'not-installed.wet',
          sourceKind: 'reading',
          display: 'warningRed',
          label: 'Leak',
        },
      },
    ],
  };
  const migrated = normaliseLayout(layout);
  expect(migrated.widgets[0]).toEqual({ ...layout.widgets[0], columnSpan: 12, rowSpan: 2 });
  expect(normaliseLayout(migrated)).toEqual(migrated);
});

it('formats generic units, precision and arrays without inventing unavailable values', () => {
  expect(formatReading(1200.125, 'MHz')).toBe('1,200 MHz');
  expect(formatReading(57.375, '°C')).toBe('57.4°C');
  expect(formatReading(0.127, 'ms')).toBe('0.13 ms');
  expect(formatReading(-29.234, '%')).toBe('-29.2%');
  expect(formatReading([12.43, 12.47], 'V')).toBe('12.4 · 12.5 V');
  expect(formatReading(3.25, 'μT')).toBe('3.25 μT');
  expect(formatReading(null, 'V')).toBe('—');
  expect(formatReading(Number.NaN, '%')).toBe('—');
  expect(readingDisplays('numberArray')[0]).toBe('array');
});

it('falls back to a compatible display after the same source changes type', () => {
  expect(compatibleReadingDisplay('number', 'warningRed')).toBe('text');
  expect(compatibleReadingDisplay('boolean', 'bar')).toBe('status');
  expect(compatibleReadingDisplay('string', 'futureDisplay')).toBe('text');
});
