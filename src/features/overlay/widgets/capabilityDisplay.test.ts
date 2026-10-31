import { expect, it } from 'vitest';

import { normaliseLayout } from '@/stores/overlayLayout';
import {
  OVERLAY_GRID_COLUMNS,
  OVERLAY_GRID_ROWS,
  OverlayAnchor,
  type OverlayLayout,
} from '@/stores/overlayTypes';

import { compatibleReadingDisplay, normalisedLevel, readingDisplays } from './capabilityDisplay';

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
it.each([4, 6, 8])('preserves unavailable capability references and a %i square light', (side) => {
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
  expect(normaliseLayout(layout)).toEqual(layout);
  expect(normaliseLayout(normaliseLayout(layout))).toEqual(layout);
});

it('falls back to a compatible display after the same source changes type', () => {
  expect(compatibleReadingDisplay('number', 'warningRed')).toBe('text');
  expect(compatibleReadingDisplay('boolean', 'bar')).toBe('status');
  expect(compatibleReadingDisplay('string', 'futureDisplay')).toBe('text');
});
