// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { receiveThrusterTestToast } from '@/tauri/thrusterTest';

import {
  START,
  CANCEL,
  invokeMock,
  unmountAll,
  mountTest,
  deferred,
  finish,
  escape,
  expectCommands,
  expectCancelSent,
  expectSettledCommands,
  focusedDialogControl,
} from './thrusterTestFixture';

const TEST_DURATION_MS = 10_000;
const RETRY_INTERVAL_MS = 1000;

beforeEach(() => {
  vi.useFakeTimers();
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(null);
});

afterEach(() => {
  unmountAll();
  vi.useRealTimers();
});

it('queues Escape behind the pending start and coalesces presses while waiting', () => {
  const pending = deferred();
  invokeMock.mockReturnValueOnce(pending.promise);
  const controller = mountTest();
  controller.start(0);
  escape();
  return vi
    .advanceTimersByTimeAsync(RETRY_INTERVAL_MS)
    .then(() => {
      escape();
      expectCommands(START);
      expect(controller.disabled().every(Boolean)).toBe(true);
      pending.resolve(null);
      return expectSettledCommands(START, CANCEL);
    })
    .then(() => {
      escape();
      return expectSettledCommands(START, CANCEL);
    })
    .then(() => {
      expect(controller.disabled().every(Boolean)).toBe(true);
      finish('toasts_thruster_test_cancelled');
      expect(controller.disabled().some(Boolean)).toBe(false);
    });
});

it('does not send a queued cancellation when the start fails', () => {
  const pending = deferred();
  invokeMock.mockReturnValueOnce(pending.promise);
  const controller = mountTest();
  controller.start(0);
  escape();
  pending.reject(new Error('Start failed'));
  return expectSettledCommands(START).then(() => {
    expect(controller.disabled().some(Boolean)).toBe(false);
    escape();
    return expectSettledCommands(START);
  });
});

it('does not cancel a newer same-index request from an old start continuation', () => {
  const pending = deferred();
  invokeMock.mockReturnValueOnce(pending.promise);
  const controller = mountTest();
  controller.start(0);
  escape();
  finish();
  controller.start(0);
  pending.resolve(null);
  return expectSettledCommands(START, START).then(() => {
    expect(controller.disabled().every(Boolean)).toBe(true);
    escape();
    return expectSettledCommands(START, START, CANCEL);
  });
});

it.each(['resolve', 'reject'] as const)(
  'drops queued Escape after disposal when start will %s',
  (outcome) => {
    const pending = deferred();
    invokeMock.mockReturnValueOnce(pending.promise);
    mountTest().start(0);
    escape();
    unmountAll();
    if (outcome === 'resolve') {
      pending.resolve(null);
    } else {
      pending.reject(new Error('Unmounted start failed'));
    }
    return expectSettledCommands(START).then(() => {
      expect(vi.getTimerCount()).toBe(0);
      mountTest().start(0);
      escape();
      return expectSettledCommands(START, START, CANCEL);
    });
  },
);

it('does nothing when idle or for other keys', () => {
  const controller = mountTest();
  escape();
  expectCommands();
  controller.start(0);
  globalThis.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(invokeMock).toHaveBeenCalledExactlyOnceWith(START, { payload: 0 });
});

it('keeps a queued test cancellable beyond ten seconds without a server terminal toast', () => {
  const controller = mountTest();
  controller.start(0);
  return vi.advanceTimersByTimeAsync(TEST_DURATION_MS).then(() => {
    expect(controller.disabled().every(Boolean)).toBe(true);
    escape();
    return expectCancelSent();
  });
});

it('does not let an old same-index timer clear a newer test', () => {
  const controller = mountTest();
  controller.start(0);
  return vi
    .advanceTimersByTimeAsync(RETRY_INTERVAL_MS)
    .then(() => {
      expect(controller.disabled().every(Boolean)).toBe(true);
      escape();
      return expectCancelSent();
    })
    .then(() => {
      finish('toasts_thruster_test_cancelled');
      controller.start(0);
      return vi.advanceTimersByTimeAsync(TEST_DURATION_MS - RETRY_INTERVAL_MS);
    })
    .then(() => {
      expect(controller.disabled().every(Boolean)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      escape();
      return expectSettledCommands(START, CANCEL, START, CANCEL);
    });
});

it('serializes starts until a server terminal toast, not cancel enqueue success', () => {
  const controller = mountTest();
  controller.start(0);
  controller.start(1);
  escape();
  return vi.advanceTimersByTimeAsync(0).then(() => {
    controller.start(1);
    expectCommands(START, CANCEL);
    finish('toasts_thruster_test_cancelled');
    controller.start(1);
    expect(invokeMock).toHaveBeenLastCalledWith(START, { payload: 1 });
  });
});

it.each([
  'toasts_thruster_test_completed',
  'toasts_thruster_test_cancelled',
  'toasts_thruster_test_unavailable',
])('ends on server %s', (key) => {
  const controller = mountTest();
  controller.start(0);
  finish(key);
  expect(controller.disabled().some(Boolean)).toBe(false);
  escape();
  expectCommands(START);
});

it('ignores loading, unrelated and local timeout messages', () => {
  const controller = mountTest();
  controller.start(0);
  finish('toasts_thruster_test_title');
  finish('toasts_operation_timed_out');
  receiveThrusterTestToast({
    identifier: 'other',
    content: { messageKey: 'toasts_thruster_test_completed' },
  });
  expect(controller.disabled().every(Boolean)).toBe(true);
});

it('ignores a late start rejection for an older request at the same index', () => {
  const pending = deferred();
  invokeMock.mockReturnValueOnce(pending.promise);
  const controller = mountTest();
  controller.start(0);
  escape();
  finish();
  controller.start(0);
  pending.reject(new Error('Old enqueue failed'));
  return vi.advanceTimersByTimeAsync(0).then(() => {
    expect(controller.disabled().every(Boolean)).toBe(true);
    escape();
    return expectCancelSent();
  });
});

it('re-enables starts after a current enqueue failure', () => {
  invokeMock.mockRejectedValueOnce(new Error('Start enqueue failed'));
  const controller = mountTest();
  controller.start(0);
  return vi.advanceTimersByTimeAsync(0).then(() => {
    expect(controller.disabled().some(Boolean)).toBe(false);
    controller.start(0);
    expectCommands(START, START);
  });
});

it('allows an immediate retry after cancel enqueue failure', () => {
  const controller = mountTest();
  controller.start(0);
  invokeMock.mockRejectedValueOnce(new Error('Cancel enqueue failed'));
  escape();
  return vi.advanceTimersByTimeAsync(0).then(() => {
    escape();
    expect(controller.disabled().every(Boolean)).toBe(true);
    return expectSettledCommands(START, CANCEL, CANCEL);
  });
});

it('deduplicates in-flight Escape even after the retry interval', () => {
  const controller = mountTest();
  controller.start(0);
  invokeMock.mockReturnValueOnce(deferred().promise);
  escape();
  return vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS).then(() => {
    escape();
    expectCommands(START, CANCEL);
  });
});

it('ignores held/rapid Escape but permits retry when enqueue success has no server response', () => {
  mountTest().start(0);
  escape();
  return vi
    .advanceTimersByTimeAsync(0)
    .then(() => {
      escape();
      expectCommands(START, CANCEL);
      return vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);
    })
    .then(() => {
      escape(globalThis, true);
      expectCommands(START, CANCEL);
      escape();
      return expectSettledCommands(START, CANCEL, CANCEL);
    });
});

it.each(['input', 'button'])('sees focused %s Escape without blocking dialog dismissal', (tag) => {
  const controller = mountTest();
  const { control, dismiss } = focusedDialogControl(tag);
  controller.start(0);
  const event = escape(control);
  expect(document.activeElement).toBe(control);
  expect(dismiss).toHaveBeenCalledOnce();
  expect(event.defaultPrevented).toBe(false);
  return expectCancelSent();
});

it('cleans up the mounted component listener/subscription and late promises without timers', () => {
  const controller = mountTest();
  const pending = deferred();
  invokeMock.mockReturnValueOnce(pending.promise);
  controller.start(0);
  unmountAll();
  finish();
  pending.reject(new Error('Unmounted'));
  return vi.advanceTimersByTimeAsync(TEST_DURATION_MS).then(() => {
    escape();
    controller.start(1);
    expectCommands(START);
    expect(controller.disabled().every(Boolean)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    mountTest().start(1);
    escape();
    return expectSettledCommands(START, START, CANCEL);
  });
});
