// Keep race scenarios sequential and fixture sizes visible in assertions.
/* eslint-disable no-magic-numbers, max-statements, oxc/no-async-await, oxc/no-optional-chaining */
import { beforeEach, expect, it, vi } from 'vitest';

const storage = vi.hoisted(() => ({ page: vi.fn(), clear: vi.fn() }));
vi.mock('@/lib/log', () => ({
  getLogRecordPage: storage.page,
  clearAllLogRecords: storage.clear,
  LOG_PAGE_SIZE: 500,
}));

import type { LogRecord } from '@/lib/log';

import { createViewerActions } from './logViewerActions';
import { createViewerSignals } from './logViewerPrimitives';
import { estimateRowHeight } from './logViewerUtils';

const record = (id: number): LogRecord => ({
  id,
  timestamp: new Date(0),
  origin: 'mcu',
  level: 'info',
  message: 'log',
});
const event = (id: number): Event => Object.assign(new Event('log:added'), { detail: record(id) });
const deferred = <Value>(): { promise: Promise<Value>; resolve: (value: Value) => void } => {
  let resolve = vi.fn<(value: Value) => void>();
  const promise = new Promise<Value>((done) => {
    resolve = vi.fn(done);
  });
  return { promise, resolve };
};
let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  vi.resetAllMocks();
  frames = [];
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
  );
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  storage.page.mockResolvedValue({ records: [], hasOlder: false });
  storage.clear.mockResolvedValue(null);
});

it('batches a burst into one bounded update and follow, without per-record measurements', async () => {
  const signals = createViewerSignals();
  const follow = vi.fn();
  const actions = createViewerActions(signals, follow);
  await actions.loadLogs();
  follow.mockClear();
  for (let id = 1; id <= 10_000; id += 1) {
    actions.handleLogAdded(event(id));
  }
  expect(frames).toHaveLength(1);
  expect(signals.logs()).toHaveLength(0);
  frames[0]?.(0);
  expect(signals.logs()).toHaveLength(500);
  expect(signals.logs()[0]?.id).toBe(9501);
  expect(signals.hasOlder()).toBe(true);
  expect(follow).toHaveBeenCalledTimes(1);
});

it('merges snapshot and live IDs even when the live frame ran before the read completed', async () => {
  const pending = deferred<{ records: LogRecord[]; hasOlder: boolean }>();
  storage.page.mockReturnValue(pending.promise);
  const signals = createViewerSignals();
  const actions = createViewerActions(signals, vi.fn());
  const loading = actions.loadLogs();
  actions.handleLogAdded(event(2));
  actions.handleLogAdded(event(3));
  frames[0]?.(0);
  pending.resolve({ records: [record(1), record(2)], hasOlder: false });
  await loading;
  expect(signals.logs().map((log) => log.id)).toEqual([1, 2, 3]);
  expect(signals.isLoading()).toBe(false);
});

it('rejects stale snapshots after clear and after disposal', async () => {
  const pending = deferred<{ records: LogRecord[]; hasOlder: boolean }>();
  storage.page.mockReturnValueOnce(pending.promise);
  const signals = createViewerSignals();
  const actions = createViewerActions(signals, vi.fn());
  const loading = actions.loadLogs();
  await actions.clearLogs();
  pending.resolve({ records: [record(1)], hasOlder: true });
  await loading;
  expect(signals.logs()).toEqual([]);
  expect(signals.hasOlder()).toBe(false);
  actions.dispose();
  actions.handleLogAdded(event(2));
  expect(signals.logs()).toEqual([]);
});

it('ends loading on failure and supports retry', async () => {
  storage.page.mockRejectedValueOnce(new Error('read failed'));
  const signals = createViewerSignals();
  const actions = createViewerActions(signals, vi.fn());
  await actions.loadLogs();
  expect(signals.isLoading()).toBe(false);
  expect(signals.loadError()).toBe(true);
  await actions.retry();
  expect(signals.loadError()).toBe(false);
});

it('replaces older pages, keeps history stable during live traffic and resumes latest', async () => {
  storage.page.mockResolvedValueOnce({ records: [record(501)], hasOlder: true });
  const signals = createViewerSignals();
  const actions = createViewerActions(signals, vi.fn());
  await actions.loadLogs();
  storage.page.mockResolvedValueOnce({ records: [record(1)], hasOlder: false });
  await actions.loadOlder();
  expect(storage.page).toHaveBeenLastCalledWith(501);
  actions.handleLogAdded(event(502));
  expect(signals.logs().map((log) => log.id)).toEqual([1]);
  expect(signals.pendingCount()).toBe(1);
  await actions.loadLogs();
  expect(signals.logs().map((log) => log.id)).toEqual([502]);
  expect(signals.paused()).toBe(false);
});

it('accounts for every explicit newline without canvas', () => {
  expect(
    estimateRowHeight(
      { ...record(1), message: Array.from({ length: 100 }, () => 'x').join('\n') },
      800,
    ),
  ).toBe(2112);
});
