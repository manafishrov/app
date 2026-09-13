// Keep timer/race scenarios sequential so the transaction boundaries remain visible.
/* eslint-disable oxc/no-async-await, max-statements, no-magic-numbers */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
  createLogRetentionScheduler,
  RETENTION_BATCH_DELAY_MS,
  RETENTION_SWEEP_INTERVAL_MS,
} from './logRetention';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

it('defers work, coalesces writers and yields between bounded transactions', async () => {
  const runBatch = vi.fn().mockResolvedValueOnce(true).mockResolvedValue(false);
  const schedule = createLogRetentionScheduler(runBatch);
  schedule();
  schedule();
  expect(runBatch).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(RETENTION_BATCH_DELAY_MS);
  expect(runBatch).toHaveBeenCalledTimes(1);
  schedule();
  expect(vi.getTimerCount()).toBe(1);
  await vi.advanceTimersByTimeAsync(RETENTION_BATCH_DELAY_MS);
  expect(runBatch).toHaveBeenCalledTimes(2);
  expect(vi.getTimerCount()).toBe(0);
  schedule();
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(RETENTION_SWEEP_INTERVAL_MS);
  schedule();
  await vi.advanceTimersByTimeAsync(RETENTION_BATCH_DELAY_MS);
  expect(runBatch).toHaveBeenCalledTimes(3);
});

it('does not overlap an in-flight batch and retries failure only on a later sweep', async () => {
  let rejectBatch = vi.fn<(reason: Error) => void>();
  const pending = new Promise<boolean>((_resolve, reject) => {
    rejectBatch = vi.fn(reject);
  });
  const runBatch = vi.fn().mockReturnValueOnce(pending).mockResolvedValue(false);
  const schedule = createLogRetentionScheduler(runBatch);
  schedule();
  await vi.advanceTimersByTimeAsync(RETENTION_BATCH_DELAY_MS);
  schedule();
  expect(vi.getTimerCount()).toBe(0);
  rejectBatch(new Error('unavailable'));
  await vi.advanceTimersByTimeAsync(0);
  schedule();
  expect(vi.getTimerCount()).toBe(0);
  await vi.advanceTimersByTimeAsync(RETENTION_SWEEP_INTERVAL_MS);
  schedule();
  await vi.advanceTimersByTimeAsync(RETENTION_BATCH_DELAY_MS);
  expect(runBatch).toHaveBeenCalledTimes(2);
});
