import { invoke } from '@tauri-apps/api/core';
// @vitest-environment happy-dom
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { receiveThrusterTestToast } from '@/tauri/thrusterTest';

import { useThrusterTest } from './thrusterTest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: vi.fn() } }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('@/paraglide/messages', () => ({
  toasts_failed_to_start_thruster_test: (): string => 'Start failed',
  toasts_failed_to_cancel_thruster_test: (): string => 'Cancel failed',
}));

const TEST_DURATION_MS = 10_000;
const RETRY_INTERVAL_MS = 1000;
const THRUSTER_COUNT = 8;
const START = 'start_thruster_test';
const CANCEL = 'cancel_thruster_test';
const invokeMock = vi.mocked(invoke);
const disposers: (() => void)[] = [];

const unmountAll = (): void => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
};

const mountTest = (): ReturnType<typeof useThrusterTest> => {
  const state: { controller: ReturnType<typeof useThrusterTest> | null } = { controller: null };
  const host = document.createElement('div');
  document.body.append(host);
  const Probe = (): HTMLElement => {
    state.controller = useThrusterTest(THRUSTER_COUNT);
    return document.createElement('div');
  };
  const dispose = render(() => createComponent(Probe, {}), host);
  disposers.push(() => {
    dispose();
    host.remove();
  });
  if (state.controller === null) {
    throw new Error('Test component did not mount');
  }
  return state.controller;
};

const deferred = (): {
  promise: Promise<null>;
  resolve: (value: null) => void;
  reject: (reason: Error) => void;
} => {
  let resolve: (value: null) => void = vi.fn();
  let reject: (reason: Error) => void = vi.fn();
  const promise = new Promise<null>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const finish = (messageKey = 'toasts_thruster_test_completed'): void => {
  receiveThrusterTestToast({ identifier: 'thruster-test', content: { messageKey } });
};

const escape = (target: EventTarget = globalThis, repeat = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
    repeat,
  });
  target.dispatchEvent(event);
  return event;
};

const expectCommands = (...commands: string[]): void => {
  expect(invokeMock.mock.calls.map(([command]) => command)).toEqual(commands);
};

beforeEach(() => {
  vi.useFakeTimers();
  invokeMock.mockReset();
  invokeMock.mockResolvedValue(null);
});

afterEach(() => {
  unmountAll();
  vi.useRealTimers();
});

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
    expect(invokeMock).toHaveBeenLastCalledWith(CANCEL, { payload: 0 });
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
      expect(invokeMock).toHaveBeenLastCalledWith(CANCEL, { payload: 0 });
      finish('toasts_thruster_test_cancelled');
      controller.start(0);
      return vi.advanceTimersByTimeAsync(TEST_DURATION_MS - RETRY_INTERVAL_MS);
    })
    .then(() => {
      expect(controller.disabled().every(Boolean)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      escape();
      expectCommands(START, CANCEL, START, CANCEL);
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
  finish();
  controller.start(0);
  pending.reject(new Error('Old enqueue failed'));
  return vi.advanceTimersByTimeAsync(0).then(() => {
    expect(controller.disabled().every(Boolean)).toBe(true);
    escape();
    expect(invokeMock).toHaveBeenLastCalledWith(CANCEL, { payload: 0 });
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
    expectCommands(START, CANCEL, CANCEL);
    expect(controller.disabled().every(Boolean)).toBe(true);
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
      expectCommands(START, CANCEL, CANCEL);
    });
});

const focusedDialogControl = (
  tag: string,
): {
  control: HTMLElement;
  dismiss: ReturnType<typeof vi.fn>;
} => {
  const dialog = document.createElement('dialog');
  dialog.open = true;
  const control = document.createElement(tag);
  dialog.append(control);
  document.body.append(dialog);
  control.focus();
  const dismiss = vi.fn((event: KeyboardEvent): void => {
    event.stopPropagation();
  });
  dialog.addEventListener('keydown', dismiss);
  disposers.push(() => {
    dialog.remove();
  });
  return { control, dismiss };
};

it.each(['input', 'button'])('sees focused %s Escape without blocking dialog dismissal', (tag) => {
  const controller = mountTest();
  const { control, dismiss } = focusedDialogControl(tag);
  controller.start(0);
  const event = escape(control);
  expect(document.activeElement).toBe(control);
  expect(dismiss).toHaveBeenCalledOnce();
  expect(event.defaultPrevented).toBe(false);
  expect(invokeMock).toHaveBeenLastCalledWith(CANCEL, { payload: 0 });
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
    expectCommands(START, START, CANCEL);
  });
});
