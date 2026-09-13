// Fixture ages, counts and sequential reads expose the retention/export boundary.
/* eslint-disable no-magic-numbers, max-statements, oxc/no-async-await */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  transaction: vi.fn(),
  add: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
}));
vi.mock('idb', () => ({ openDB: vi.fn(() => Promise.resolve(database)), deleteDB: vi.fn() }));

import { deleteDB } from 'idb';

import { createLogRecord, deleteExpiredLogBatch, getStoredLogRecords } from './log';
import { RETENTION_BATCH_DELAY_MS, RETENTION_BATCH_SIZE } from './logRetention';

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal('IDBKeyRange', { upperBound: vi.fn((date: Date) => date) });
  vi.stubGlobal('dispatchEvent', vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each([0, 1, RETENTION_BATCH_SIZE, RETENTION_BATCH_SIZE + 1, 100_000])(
  'deletes at most one batch from %i expired records via the seven-day index',
  async (count) => {
    const remove = vi.fn(() => Promise.resolve());
    const cursorAt = (remaining: number): object | null =>
      remaining === 0
        ? null
        : {
            delete: remove,
            continue: (): Promise<object | null> => Promise.resolve(cursorAt(remaining - 1)),
          };
    const openCursor = vi.fn(() => Promise.resolve(cursorAt(count)));
    const index = vi.fn(() => ({ openCursor }));
    database.transaction.mockReturnValue({
      objectStore: () => ({ index }),
      done: Promise.resolve(),
    });
    expect(await deleteExpiredLogBatch()).toBe(count > RETENTION_BATCH_SIZE);
    expect(remove).toHaveBeenCalledTimes(Math.min(count, RETENTION_BATCH_SIZE));
    expect(database.transaction).toHaveBeenCalledExactlyOnceWith('logRecords', 'readwrite');
    expect(index).toHaveBeenCalledExactlyOnceWith('timestamp');
    expect(openCursor).toHaveBeenCalledExactlyOnceWith(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    );
  },
);

it('does not reset the database on a failed maintenance transaction', async () => {
  database.transaction.mockImplementation(() => {
    throw new DOMException('Unavailable', 'NotFoundError');
  });
  await expect(deleteExpiredLogBatch()).rejects.toThrow('Unavailable');
  expect(deleteDB).not.toHaveBeenCalled();
});

it('schedules maintenance after persistence, while export neither triggers nor waits for it', async () => {
  const record = { id: 1, timestamp: new Date(0), origin: 'mcu', level: 'info', message: 'old' };
  database.getAll.mockResolvedValue([record]);
  expect(await getStoredLogRecords()).toEqual([record]);
  expect(vi.getTimerCount()).toBe(0);
  database.add.mockResolvedValue(1);
  database.get.mockResolvedValue(record);
  await createLogRecord({ origin: 'mcu', level: 'info', message: 'new' });
  expect(vi.getTimerCount()).toBe(1);
  expect(database.transaction).not.toHaveBeenCalled();
  expect(await getStoredLogRecords()).toEqual([record]);
  expect(database.transaction).not.toHaveBeenCalled();
  database.transaction.mockReturnValue({
    objectStore: vi.fn(() => ({
      index: vi.fn(() => ({ openCursor: vi.fn(() => Promise.resolve(null)) })),
    })),
    done: Promise.resolve(),
  });
  await vi.advanceTimersByTimeAsync(RETENTION_BATCH_DELAY_MS);
  expect(database.transaction).toHaveBeenCalledTimes(1);
});
