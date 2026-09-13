import { invoke } from '@tauri-apps/api/core';
import { createComponent } from 'solid-js';
import { render } from 'solid-js/web';
import { expect, vi } from 'vitest';

import { receiveThrusterTestToast } from '@/tauri/thrusterTest';

import { useThrusterTest } from './thrusterTest';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: vi.fn() } }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('@/paraglide/messages', () => ({
  toasts_failed_to_start_thruster_test: (): string => 'Start failed',
  toasts_failed_to_cancel_thruster_test: (): string => 'Cancel failed',
}));

const THRUSTER_COUNT = 8;
export const START = 'start_thruster_test';
export const CANCEL = 'cancel_thruster_test';
export const invokeMock = vi.mocked(invoke);
const disposers: (() => void)[] = [];

export const unmountAll = (): void => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
};

export const mountTest = (): ReturnType<typeof useThrusterTest> => {
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

export const deferred = (): {
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

export const finish = (messageKey = 'toasts_thruster_test_completed'): void => {
  receiveThrusterTestToast({ identifier: 'thruster-test', content: { messageKey } });
};

export const escape = (target: EventTarget = globalThis, repeat = false): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
    repeat,
  });
  target.dispatchEvent(event);
  return event;
};

export const expectCommands = (...commands: string[]): void => {
  expect(invokeMock.mock.calls.map(([command]) => command)).toEqual(commands);
};

export const expectCancelSent = (): Promise<void> =>
  vi.advanceTimersByTimeAsync(0).then(() => {
    expect(invokeMock).toHaveBeenLastCalledWith(CANCEL, { payload: 0 });
  });

export const expectSettledCommands = (...commands: string[]): Promise<void> =>
  vi.advanceTimersByTimeAsync(0).then(() => {
    expectCommands(...commands);
  });

export const focusedDialogControl = (
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
