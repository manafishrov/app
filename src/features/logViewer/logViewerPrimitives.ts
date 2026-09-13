import { createVirtualizer, type Virtualizer } from '@tanstack/solid-virtual';
import { type Accessor, createMemo, createSignal } from 'solid-js';

import type { LogLevel, LogOrigin, LogRecord } from '@/lib/log';

import { ROW_ESTIMATE, estimateRowHeight } from './logViewerUtils';
import { createLogWindowOptions } from './logWindowOptions';

export type ViewerSignals = {
  viewportRef: Accessor<HTMLDivElement | undefined>;
  setViewportRef: (value: HTMLDivElement | undefined) => void;
  viewportWidth: Accessor<number>;
  setViewportWidth: (value: number) => void;
  logs: Accessor<LogRecord[]>;
  setLogs: (value: LogRecord[] | ((prev: LogRecord[]) => LogRecord[])) => void;
  searchQuery: Accessor<string>;
  setSearchQuery: (value: string) => void;
  followTail: Accessor<boolean>;
  setFollowTail: (value: boolean) => void;
  paused: Accessor<boolean>;
  setPaused: (value: boolean) => void;
  pendingCount: Accessor<number>;
  setPendingCount: (value: number) => void;
  hasOlder: Accessor<boolean>;
  setHasOlder: (value: boolean) => void;
  loadError: Accessor<boolean>;
  setLoadError: (value: boolean) => void;
  isLoading: Accessor<boolean>;
  setIsLoading: (value: boolean) => void;
  sourceFilters: Accessor<Record<LogOrigin, boolean>>;
  setSourceFilters: (
    value:
      | Record<LogOrigin, boolean>
      | ((prev: Record<LogOrigin, boolean>) => Record<LogOrigin, boolean>),
  ) => void;
  levelFilters: Accessor<Record<LogLevel, boolean>>;
  setLevelFilters: (
    value:
      | Record<LogLevel, boolean>
      | ((prev: Record<LogLevel, boolean>) => Record<LogLevel, boolean>),
  ) => void;
};

const createFilterSignals = (): Pick<
  ViewerSignals,
  'sourceFilters' | 'setSourceFilters' | 'levelFilters' | 'setLevelFilters'
> => {
  const [sourceFilters, setSourceFilters] = createSignal<Record<LogOrigin, boolean>>({
    frontend: true,
    backend: true,
    firmware: true,
    mcu: true,
  });
  const [levelFilters, setLevelFilters] = createSignal<Record<LogLevel, boolean>>({
    info: true,
    warn: true,
    error: true,
  });

  return { sourceFilters, setSourceFilters, levelFilters, setLevelFilters };
};

const createLoadingSignals = (): Pick<
  ViewerSignals,
  'hasOlder' | 'setHasOlder' | 'loadError' | 'setLoadError' | 'isLoading' | 'setIsLoading'
> => {
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasOlder, setHasOlder] = createSignal(false);
  const [loadError, setLoadError] = createSignal(false);
  return { isLoading, setIsLoading, hasOlder, setHasOlder, loadError, setLoadError };
};

export const createViewerSignals = (): ViewerSignals => {
  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | undefined>();
  const [viewportWidth, setViewportWidth] = createSignal(0);
  const [logs, setLogs] = createSignal<LogRecord[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [followTail, setFollowTail] = createSignal(true);
  const [paused, setPaused] = createSignal(false);
  const [pendingCount, setPendingCount] = createSignal(0);
  const filters = createFilterSignals();

  return {
    viewportRef,
    setViewportRef,
    viewportWidth,
    setViewportWidth,
    logs,
    setLogs,
    searchQuery,
    setSearchQuery,
    followTail,
    setFollowTail,
    paused,
    setPaused,
    pendingCount,
    setPendingCount,
    ...createLoadingSignals(),
    ...filters,
  };
};

export const createFilteredLogs = (signals: ViewerSignals): Accessor<LogRecord[]> =>
  createMemo(() => {
    const allLogs = signals.logs();
    const query = signals.searchQuery().toLowerCase().trim();
    const sources = signals.sourceFilters();
    const levels = signals.levelFilters();

    return allLogs.filter((log) => {
      const isSourceMatch = sources[log.origin];
      const isLevelMatch = levels[log.level];

      if (!isSourceMatch || !isLevelMatch) {
        return false;
      }

      if (query.length > 0) {
        const matchesMessage = log.message.toLowerCase().includes(query);
        const matchesLevel = log.level.toLowerCase().includes(query);
        const matchesOrigin = log.origin.toLowerCase().includes(query);
        return matchesMessage || matchesLevel || matchesOrigin;
      }

      return true;
    });
  });

export type VirtualizerType = Virtualizer<HTMLDivElement, Element>;

const createScrollToBottom =
  (
    virtualizer: VirtualizerType,
    filteredLogs: Accessor<LogRecord[]>,
    setFollowTail: (value: boolean) => void,
  ) =>
  (): void => {
    const items = filteredLogs();
    if (items.length === 0) {
      return;
    }
    virtualizer.scrollToIndex(items.length - 1, { align: 'end' });
    setFollowTail(true);
  };

const createRemeasureAndFollowTail =
  (followTail: Accessor<boolean>, scrollToBottom: () => void, scrollToStart: () => void) =>
  (position?: 'start'): void => {
    queueMicrotask((): void => {
      if (position === 'start') {
        scrollToStart();
      } else if (followTail()) {
        scrollToBottom();
      }
    });
  };

// Estimate off-screen rows; visible rows use actual DOM heights.
const createEstimateSize =
  (filteredLogs: Accessor<LogRecord[]>, viewportWidth: Accessor<number>) =>
  (index: number): number => {
    const log = filteredLogs()[index];
    const width = viewportWidth();
    if (!log || width <= 0) {
      return ROW_ESTIMATE;
    }
    return estimateRowHeight(log, width);
  };

export const createVirtualizerTools = (args: {
  viewportRef: Accessor<HTMLDivElement | undefined>;
  viewportWidth: Accessor<number>;
  filteredLogs: Accessor<LogRecord[]>;
  followTail: Accessor<boolean>;
  setFollowTail: (value: boolean) => void;
}): {
  virtualizer: VirtualizerType;
  remeasureAndFollowTail: (position?: 'start') => void;
} => {
  const windowOptions = createLogWindowOptions(args.filteredLogs);
  const virtualizer = createVirtualizer<HTMLDivElement, Element>({
    get count() {
      return windowOptions.count;
    },
    get getItemKey() {
      return windowOptions.getItemKey;
    },
    get enabled() {
      return Boolean(args.viewportRef());
    },
    getScrollElement: () => args.viewportRef() ?? null,
    estimateSize: createEstimateSize(args.filteredLogs, args.viewportWidth),
    useAnimationFrameWithResizeObserver: true,
  });

  const scrollToBottom = createScrollToBottom(virtualizer, args.filteredLogs, args.setFollowTail);
  const remeasureAndFollowTail = createRemeasureAndFollowTail(
    args.followTail,
    scrollToBottom,
    () => {
      virtualizer.scrollToIndex(0, { align: 'start' });
    },
  );

  return { virtualizer, remeasureAndFollowTail };
};
