import { createVirtualizer, type Virtualizer } from '@tanstack/solid-virtual';
import { type Accessor, createMemo, createSignal } from 'solid-js';

import { getAllLogRecords, type LogLevel, type LogOrigin, type LogRecord } from '@/lib/log';

import { ROW_ESTIMATE, isNearBottom } from './logViewerUtils';

export type ViewerSignals = {
  viewportRef: Accessor<HTMLDivElement | undefined>;
  setViewportRef: (value: HTMLDivElement | undefined) => void;
  logs: Accessor<LogRecord[]>;
  setLogs: (value: LogRecord[] | ((prev: LogRecord[]) => LogRecord[])) => void;
  searchQuery: Accessor<string>;
  setSearchQuery: (value: string) => void;
  followTail: Accessor<boolean>;
  setFollowTail: (value: boolean) => void;
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

export const createViewerSignals = (): ViewerSignals => {
  const [viewportRef, setViewportRef] = createSignal<HTMLDivElement | undefined>();
  const [logs, setLogs] = createSignal<LogRecord[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [followTail, setFollowTail] = createSignal(true);
  const [isLoading, setIsLoading] = createSignal(true);
  const [sourceFilters, setSourceFilters] = createSignal<Record<LogOrigin, boolean>>({
    frontend: true,
    backend: true,
    firmware: true,
  });
  const [levelFilters, setLevelFilters] = createSignal<Record<LogLevel, boolean>>({
    info: true,
    warn: true,
    error: true,
  });

  return {
    viewportRef,
    setViewportRef,
    logs,
    setLogs,
    searchQuery,
    setSearchQuery,
    followTail,
    setFollowTail,
    isLoading,
    setIsLoading,
    sourceFilters,
    setSourceFilters,
    levelFilters,
    setLevelFilters,
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

const createNullValue = (): null => {
  const result = /a/.exec('');
  if (Array.isArray(result)) {
    throw new TypeError('Expected null from regex mismatch');
  }
  return result;
};

const NULL_VALUE = createNullValue();

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

const createMeasureRow =
  (virtualizer: VirtualizerType) =>
  (element: HTMLDivElement): void => {
    virtualizer.measureElement(element);
    queueMicrotask((): void => {
      virtualizer.measureElement(element);
    });
    requestAnimationFrame((): void => {
      virtualizer.measureElement(element);
    });
  };

const createRemeasureAndFollowTail =
  (virtualizer: VirtualizerType, followTail: Accessor<boolean>, scrollToBottom: () => void) =>
  (): void => {
    queueMicrotask((): void => {
      virtualizer.measure();
      if (followTail()) {
        scrollToBottom();
      }
      requestAnimationFrame((): void => {
        virtualizer.measure();
        if (followTail()) {
          scrollToBottom();
        }
      });
    });
  };

export const createVirtualizerTools = (args: {
  viewportRef: Accessor<HTMLDivElement | undefined>;
  filteredLogs: Accessor<LogRecord[]>;
  followTail: Accessor<boolean>;
  setFollowTail: (value: boolean) => void;
}): {
  virtualizer: VirtualizerType;
  measureRow: (element: HTMLDivElement) => void;
  remeasureAndFollowTail: () => void;
} => {
  const virtualizer = createVirtualizer<HTMLDivElement, Element>({
    get count() {
      return args.filteredLogs().length;
    },
    get enabled() {
      return Boolean(args.viewportRef());
    },
    getScrollElement: () => args.viewportRef() ?? NULL_VALUE,
    estimateSize: () => ROW_ESTIMATE,
    getItemKey: (index: number): number | string => {
      const item = args.filteredLogs()[index];
      if (!item) {
        return index;
      }
      return `${item.timestamp.toISOString()}-${item.origin}-${item.level}-${index}`;
    },
  });

  const scrollToBottom = createScrollToBottom(virtualizer, args.filteredLogs, args.setFollowTail);
  const measureRow = createMeasureRow(virtualizer);
  const remeasureAndFollowTail = createRemeasureAndFollowTail(
    virtualizer,
    args.followTail,
    scrollToBottom,
  );

  return { virtualizer, measureRow, remeasureAndFollowTail };
};

const createLoadLogs =
  (signals: ViewerSignals, remeasureAndFollowTail: () => void) => (): Promise<void> => {
    signals.setIsLoading(true);
    return getAllLogRecords().then((records): void => {
      signals.setLogs(records);
      signals.setIsLoading(false);
      remeasureAndFollowTail();
    });
  };

const isCustomEvent = (event: Event): event is CustomEvent<unknown> => 'detail' in event;

const isLogRecord = (value: unknown): value is LogRecord => {
  if (!(value instanceof Object)) {
    return false;
  }

  return (
    'timestamp' in value &&
    value.timestamp instanceof Date &&
    'origin' in value &&
    (value.origin === 'frontend' || value.origin === 'backend' || value.origin === 'firmware') &&
    'level' in value &&
    (value.level === 'info' || value.level === 'warn' || value.level === 'error') &&
    'message' in value &&
    typeof value.message === 'string'
  );
};

const createHandleLogAdded =
  (signals: ViewerSignals, remeasureAndFollowTail: () => void) =>
  (event: Event): void => {
    if (!isCustomEvent(event)) {
      return;
    }

    const { detail } = event;
    if (!isLogRecord(detail)) {
      return;
    }

    signals.setLogs((prev): LogRecord[] => [...prev, detail]);
    remeasureAndFollowTail();
  };

const createHandleViewportScroll = (signals: ViewerSignals) => (): void => {
  const viewport = signals.viewportRef();
  if (!viewport) {
    return;
  }
  signals.setFollowTail(isNearBottom(viewport));
};

export const createViewerActions = (
  signals: ViewerSignals,
  remeasureAndFollowTail: () => void,
): {
  setViewportRefWhenReady: (element: HTMLDivElement) => void;
  loadLogs: () => Promise<void>;
  handleLogAdded: (event: Event) => void;
  handleViewportScroll: () => void;
  toggleSourceFilter: (source: LogOrigin) => void;
  toggleLevelFilter: (level: LogLevel) => void;
} => {
  const setViewportRefWhenReady = (element: HTMLDivElement): void => {
    queueMicrotask((): void => {
      if (element.isConnected) {
        signals.setViewportRef(element);
      }
    });
  };

  const toggleSourceFilter = (source: LogOrigin): void => {
    signals.setSourceFilters((prev) => ({ ...prev, [source]: !prev[source] }));
    remeasureAndFollowTail();
  };

  const toggleLevelFilter = (level: LogLevel): void => {
    signals.setLevelFilters((prev) => ({ ...prev, [level]: !prev[level] }));
    remeasureAndFollowTail();
  };

  return {
    setViewportRefWhenReady,
    loadLogs: createLoadLogs(signals, remeasureAndFollowTail),
    handleLogAdded: createHandleLogAdded(signals, remeasureAndFollowTail),
    handleViewportScroll: createHandleViewportScroll(signals),
    toggleSourceFilter,
    toggleLevelFilter,
  };
};
