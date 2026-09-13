import type { VirtualizerOptions } from '@tanstack/solid-virtual';

import { createMemo, type Accessor } from 'solid-js';

import type { LogRecord } from '@/lib/log';

export const createLogWindowOptions = (
  logs: Accessor<LogRecord[]>,
): Required<Pick<VirtualizerOptions<HTMLDivElement, Element>, 'count' | 'getItemKey'>> => {
  // Virtual-core memoizes layouts by count and key-function identity.
  // Capture each filtered window to invalidate positions, not measured sizes.
  const keyForWindow = createMemo(() => {
    const records = logs();
    return (index: number): number => {
      const item = records[index];
      return item ? item.id : index;
    };
  });
  return {
    get count() {
      return logs().length;
    },
    get getItemKey() {
      return keyForWindow();
    },
  };
};
