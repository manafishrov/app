// Explicit fixture sizes and sequential assertions document the real virtual-core regression.
/* eslint-disable no-magic-numbers, max-statements, max-lines-per-function, oxc/no-optional-chaining */
import { Virtualizer } from '@tanstack/solid-virtual';
import { createRoot, createSignal } from 'solid-js';
import { expect, it, vi } from 'vitest';

// Exercise client reactivity without substituting virtual-core or its measurement cache.
vi.mock('solid-js', () => vi.importActual('solid-js/dist/solid.js'));

import type { LogRecord } from '@/lib/log';

import { createLogWindowOptions } from './logWindowOptions';

const records = (start: number, step = 1): LogRecord[] =>
  Array.from({ length: 500 }, (_, index) => ({
    id: start + index * step,
    timestamp: new Date(0),
    origin: 'mcu',
    level: 'info',
    message: 'log',
  }));
const nextWindow = (change: string): LogRecord[] => {
  if (change === 'rolling') {
    return records(2);
  }
  return change === 'page' ? records(501) : records(2, 2);
};
const ignoreScroll = (): void => {
  /* No scroll element is needed to compute the real layout. */
};

it.each(['rolling', 'page', 'filter'])(
  'invalidates equal-count %s layouts and retains measured sizes by ID',
  (change) => {
    createRoot((dispose) => {
      const initial = records(1);
      const next = nextWindow(change);
      const [logs, setLogs] = createSignal(initial);
      const options = createLogWindowOptions(logs);
      const estimateSize = vi.fn((index: number) => (logs()[index]?.id ?? 0) * 2);
      const virtualizer = new Virtualizer<HTMLDivElement, Element>({
        ...options,
        getScrollElement: (): null => null,
        estimateSize,
        scrollToFn: ignoreScroll,
        observeElementRect: ignoreScroll,
        observeElementOffset: ignoreScroll,
        initialRect: { width: 800, height: 600 },
      });
      const measure = vi.spyOn(virtualizer, 'measure');
      virtualizer.getTotalSize();
      virtualizer.resizeItem(1, 77);
      virtualizer.getTotalSize();
      const previousKeyFunction = options.getItemKey;
      setLogs(next);
      virtualizer.setOptions({ ...virtualizer.options, ...options });
      const expectedHeight = next.reduce(
        (total, record) => total + (record.id === 2 ? 77 : record.id * 2),
        0,
      );
      expect(virtualizer.getTotalSize()).toBe(expectedHeight);
      expect(options.getItemKey).not.toBe(previousKeyFunction);
      expect(options.getItemKey).toBe(options.getItemKey);
      expect(
        Array.from(
          { length: next.length },
          (_, index) => virtualizer.measurementsCache[index]?.key,
        ),
      ).toEqual(next.map((record) => record.id));
      expect(virtualizer.itemSizeCache.get(2)).toBe(77);
      expect(measure).not.toHaveBeenCalled();
      const estimates = estimateSize.mock.calls.length;
      virtualizer.setOptions({ ...virtualizer.options, ...options });
      virtualizer.getTotalSize();
      expect(estimateSize).toHaveBeenCalledTimes(estimates);
      dispose();
    });
  },
);
