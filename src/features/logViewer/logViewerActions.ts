import { batch } from 'solid-js';

import {
  clearAllLogRecords,
  getLogRecordPage,
  LOG_PAGE_SIZE,
  type LogLevel,
  type LogOrigin,
  type LogRecord,
} from '@/lib/log';

import type { ViewerSignals } from './logViewerPrimitives';

import { isNearBottom } from './logViewerUtils';

export type ViewerActions = {
  setViewportRefWhenReady: (element: HTMLDivElement) => void;
  loadLogs: () => Promise<void>;
  loadOlder: () => Promise<void>;
  retry: () => Promise<void>;
  dispose: () => void;
  handleLogAdded: (event: Event) => void;
  handleViewportScroll: () => void;
  togglePause: () => void;
  clearLogs: () => Promise<void>;
  toggleSourceFilter: (source: LogOrigin) => void;
  toggleLevelFilter: (level: LogLevel) => void;
};

type Context = {
  signals: ViewerSignals;
  followTail: (position?: 'start') => void;
  generation: number;
  disposed: boolean;
  clearing: boolean;
  history: boolean;
  dropped: boolean;
  before?: number;
  queued: LogRecord[];
  duringLoad: LogRecord[];
  frame: number | null;
};

const isLogRecord = (value: unknown): value is LogRecord =>
  value instanceof Object &&
  'id' in value &&
  typeof value.id === 'number' &&
  'timestamp' in value &&
  value.timestamp instanceof Date &&
  'origin' in value &&
  (value.origin === 'frontend' ||
    value.origin === 'backend' ||
    value.origin === 'firmware' ||
    value.origin === 'mcu') &&
  'level' in value &&
  (value.level === 'info' || value.level === 'warn' || value.level === 'error') &&
  'message' in value &&
  typeof value.message === 'string';

const mergeRecords = (...groups: LogRecord[][]): LogRecord[] =>
  [...new Map(groups.flat().map((record) => [record.id, record])).values()]
    // ES2022 WebViews lack toSorted; this array is newly allocated.
    // eslint-disable-next-line unicorn/no-array-sort
    .sort((left, right) => left.id - right.id);

const cancelFrame = (context: Context): void => {
  if (context.frame !== null) {
    cancelAnimationFrame(context.frame);
    context.frame = null;
  }
};
const setWindow = (context: Context, records: LogRecord[], hasOlder: boolean): void => {
  context.signals.setLogs(records.slice(-LOG_PAGE_SIZE));
  context.signals.setHasOlder(
    hasOlder || (!context.history && context.dropped) || records.length > LOG_PAGE_SIZE,
  );
};

const flush = (context: Context): void => {
  context.frame = null;
  const { signals } = context;
  if (context.disposed || signals.paused() || context.history) {
    return;
  }
  const records = context.queued;
  context.queued = [];
  batch(() => {
    setWindow(context, mergeRecords(signals.logs(), records), signals.hasOlder());
    signals.setPendingCount(0);
  });
  context.followTail();
};

const applyPage = (context: Context, page: Awaited<ReturnType<typeof getLogRecordPage>>): void => {
  const { signals } = context;
  batch(() => {
    setWindow(
      context,
      context.history
        ? page.records
        : mergeRecords(page.records, context.duringLoad, context.queued),
      page.hasOlder,
    );
    signals.setFollowTail(!context.history);
    signals.setPaused(context.history);
    signals.setPendingCount(0);
  });
  context.queued = [];
  context.duringLoad = [];
  if (context.history) {
    context.followTail('start');
  } else {
    context.followTail();
  }
};

const load = (context: Context, cursor?: number): Promise<void> => {
  if (context.clearing || context.disposed) {
    return Promise.resolve();
  }
  context.generation += 1;
  const token = context.generation;
  Object.assign(context, {
    before: cursor,
    history: typeof cursor === 'number',
    duringLoad: [],
    dropped: false,
  });
  context.signals.setIsLoading(true);
  context.signals.setLoadError(false);
  return getLogRecordPage(cursor)
    .then((page) => {
      if (!context.disposed && token === context.generation) {
        applyPage(context, page);
      }
    })
    .catch(() => {
      if (!context.disposed && token === context.generation) {
        context.signals.setLoadError(true);
      }
    })
    .finally(() => {
      if (!context.disposed && token === context.generation) {
        context.signals.setIsLoading(false);
      }
    });
};

const bufferDuringLoad = (context: Context, record: LogRecord): void => {
  if (context.signals.isLoading()) {
    context.duringLoad.push(record);
    if (context.duringLoad.length > LOG_PAGE_SIZE) {
      context.duringLoad = context.duringLoad.slice(-LOG_PAGE_SIZE);
    }
  }
};

const queueRecord = (context: Context, record: LogRecord): void => {
  bufferDuringLoad(context, record);
  context.queued.push(record);
  if (context.queued.length > LOG_PAGE_SIZE) {
    context.queued = context.queued.slice(-LOG_PAGE_SIZE);
    context.dropped = true;
  }
};

const handleLogAdded = (context: Context, event: Event): void => {
  if (context.disposed || context.clearing || !('detail' in event) || !isLogRecord(event.detail)) {
    return;
  }
  const { signals } = context;
  queueRecord(context, event.detail);
  if (signals.paused() || context.history) {
    signals.setPendingCount(signals.pendingCount() + 1);
  } else {
    context.frame ??= requestAnimationFrame(() => {
      flush(context);
    });
  }
};

const clearLogs = (context: Context): Promise<void> => {
  if (context.clearing || context.disposed) {
    return Promise.resolve();
  }
  context.generation += 1;
  cancelFrame(context);
  Object.assign(context, { clearing: true, queued: [], duringLoad: [] });
  context.signals.setIsLoading(true);
  context.signals.setLoadError(false);
  let failed = false;
  return clearAllLogRecords()
    .catch(() => {
      failed = true;
    })
    .then(() => {
      context.clearing = false;
      return load(context);
    })
    .then(() => {
      if (!context.disposed && failed) {
        context.signals.setLoadError(true);
      }
    });
};

const togglePause = (context: Context): void => {
  if (context.history) {
    load(context).catch(() => {
      context.signals.setLoadError(true);
    });
    return;
  }
  context.signals.setPaused(!context.signals.paused());
  if (!context.signals.paused()) {
    cancelFrame(context);
    flush(context);
  }
};

const setViewport = (context: Context, element: HTMLDivElement): void => {
  queueMicrotask(() => {
    if (!context.disposed && element.isConnected) {
      context.signals.setViewportRef(element);
      context.signals.setViewportWidth(element.clientWidth);
    }
  });
};

const handleScroll = (signals: ViewerSignals): void => {
  const viewport = signals.viewportRef();
  if (viewport) {
    signals.setFollowTail(isNearBottom(viewport));
  }
};

const createContext = (
  signals: ViewerSignals,
  followTail: (position?: 'start') => void,
): Context => ({
  signals,
  followTail,
  generation: 0,
  disposed: false,
  clearing: false,
  history: false,
  dropped: false,
  queued: [],
  duringLoad: [],
  frame: null,
});

export const createViewerActions = (
  signals: ViewerSignals,
  followTail: (position?: 'start') => void,
): ViewerActions => {
  const context = createContext(signals, followTail);
  return {
    loadLogs: () => load(context),
    loadOlder: () => {
      const [first] = signals.logs();
      return first ? load(context, first.id) : Promise.resolve();
    },
    retry: () => load(context, context.before),
    dispose: (): void => {
      context.disposed = true;
      context.generation += 1;
      cancelFrame(context);
    },
    handleLogAdded: (event): void => {
      handleLogAdded(context, event);
    },
    handleViewportScroll: (): void => {
      handleScroll(signals);
    },
    togglePause: (): void => {
      togglePause(context);
    },
    clearLogs: () => clearLogs(context),
    setViewportRefWhenReady: (element): void => {
      setViewport(context, element);
    },
    toggleSourceFilter: (source): void => {
      signals.setSourceFilters((previous) => ({ ...previous, [source]: !previous[source] }));
      followTail();
    },
    toggleLevelFilter: (level): void => {
      signals.setLevelFilters((previous) => ({ ...previous, [level]: !previous[level] }));
      followTail();
    },
  };
};
