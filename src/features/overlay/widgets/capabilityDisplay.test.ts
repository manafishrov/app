import { expect, it } from 'vitest';

import { normaliseLayout } from '@/stores/overlayLayout';
import { OverlayAnchor, type OverlayLayout } from '@/stores/overlayTypes';

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
it.each([2, 6])('preserves unavailable capability references and a 6 by %i footprint', (rows) => {
  const layout: OverlayLayout = {
    id: 'test',
    name: 'Test',
    columns: 32,
    rows: 24,
    widgets: [
      {
        id: 'sensor',
        type: 'capability',
        column: 7,
        row: 9,
        columnSpan: 6,
        rowSpan: rows,
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
