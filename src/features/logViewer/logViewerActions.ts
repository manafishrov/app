import {
  clearAllLogRecords,
  getAllLogRecords,
  type LogLevel,
  type LogOrigin,
  type LogRecord,
} from '@/lib/log';

import type { ViewerSignals } from './logViewerPrimitives';

import { isNearBottom } from './logViewerUtils';

export type ViewerActions = {
  setViewportRefWhenReady: (element: HTMLDivElement) => void;
  loadLogs: () => Promise<void>;
  handleLogAdded: (event: Event) => void;
  handleViewportScroll: () => void;
  togglePause: () => void;
  clearLogs: () => Promise<void>;
  toggleSourceFilter: (source: LogOrigin) => void;
  toggleLevelFilter: (level: LogLevel) => void;
};

// Records that arrived while the viewer was paused are held in the buffer (outside reactive state so they don't re-render) and flushed into `logs` on resume.
type ActionContext = {
  signals: ViewerSignals;
  buffer: { records: LogRecord[] };
  remeasureAndFollowTail: () => void;
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
    (value.origin === 'frontend' ||
      value.origin === 'backend' ||
      value.origin === 'firmware' ||
      value.origin === 'mcu') &&
    'level' in value &&
    (value.level === 'info' || value.level === 'warn' || value.level === 'error') &&
    'message' in value &&
    typeof value.message === 'string'
  );
};

const createLoadLogs = (context: ActionContext) => (): Promise<void> => {
  context.signals.setIsLoading(true);
  return getAllLogRecords().then((records): void => {
    context.signals.setLogs(records);
    context.signals.setIsLoading(false);
    context.remeasureAndFollowTail();
  });
};

const appendRecord = (context: ActionContext, record: LogRecord): void => {
  if (context.signals.paused()) {
    context.buffer.records.push(record);
    context.signals.setPendingCount(context.buffer.records.length);
    return;
  }

  context.signals.setLogs((prev): LogRecord[] => [...prev, record]);
  context.remeasureAndFollowTail();
};

const createHandleLogAdded =
  (context: ActionContext) =>
  (event: Event): void => {
    if (!isCustomEvent(event)) {
      return;
    }
    const { detail } = event;
    if (isLogRecord(detail)) {
      appendRecord(context, detail);
    }
  };

const createHandleViewportScroll = (context: ActionContext) => (): void => {
  const viewport = context.signals.viewportRef();
  if (!viewport) {
    return;
  }
  context.signals.setFollowTail(isNearBottom(viewport));
};

const createResume = (context: ActionContext) => (): void => {
  const buffered = context.buffer.records;
  context.buffer.records = [];
  context.signals.setPendingCount(0);
  context.signals.setPaused(false);
  if (buffered.length > 0) {
    context.signals.setLogs((prev): LogRecord[] => [...prev, ...buffered]);
  }
  context.remeasureAndFollowTail();
};

const createTogglePause = (context: ActionContext) => (): void => {
  if (context.signals.paused()) {
    createResume(context)();
    return;
  }
  context.signals.setPaused(true);
};

const createClearLogs = (context: ActionContext) => (): Promise<void> => {
  context.buffer.records = [];
  context.signals.setPendingCount(0);
  context.signals.setLogs([]);
  context.remeasureAndFollowTail();
  return clearAllLogRecords();
};

const createSetViewportRefWhenReady =
  (context: ActionContext) =>
  (element: HTMLDivElement): void => {
    queueMicrotask((): void => {
      if (element.isConnected) {
        context.signals.setViewportRef(element);
        context.signals.setViewportWidth(element.clientWidth);
      }
    });
  };

const createToggleSourceFilter =
  (context: ActionContext) =>
  (source: LogOrigin): void => {
    context.signals.setSourceFilters((prev) => ({ ...prev, [source]: !prev[source] }));
    context.remeasureAndFollowTail();
  };

const createToggleLevelFilter =
  (context: ActionContext) =>
  (level: LogLevel): void => {
    context.signals.setLevelFilters((prev) => ({ ...prev, [level]: !prev[level] }));
    context.remeasureAndFollowTail();
  };

export const createViewerActions = (
  signals: ViewerSignals,
  remeasureAndFollowTail: () => void,
): ViewerActions => {
  const context: ActionContext = {
    signals,
    buffer: { records: [] },
    remeasureAndFollowTail,
  };

  return {
    setViewportRefWhenReady: createSetViewportRefWhenReady(context),
    loadLogs: createLoadLogs(context),
    handleLogAdded: createHandleLogAdded(context),
    handleViewportScroll: createHandleViewportScroll(context),
    togglePause: createTogglePause(context),
    clearLogs: createClearLogs(context),
    toggleSourceFilter: createToggleSourceFilter(context),
    toggleLevelFilter: createToggleLevelFilter(context),
  };
};
