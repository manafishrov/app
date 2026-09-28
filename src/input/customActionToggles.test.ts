// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';

import type { CustomActionBinding } from '@/stores/config';

import { createKeyboardTracker } from '@/input/keyboard';

import {
  handleCustomActionToggles,
  releaseCustomActions,
  setupCustomActionFocusRelease,
} from './customActionToggles';

const transport = vi.hoisted(() => ({ invoke: vi.fn(() => Promise.resolve()), connected: true }));
vi.mock('@/tauri/capabilities', () => ({ invokeAction: transport.invoke }));
vi.mock('@/stores/capabilities', () => ({
  capabilityStore: {
    get connected(): boolean {
      return transport.connected;
    },
    catalog: { actions: [{ id: 'dispenser.dispense', extensionId: null }] },
  },
}));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
const binding: CustomActionBinding = {
  id: 'binding',
  actionId: 'dispenser.dispense',
  module: '',
  trigger: 'hold',
  keyboard: { key: 'KeyD', minValue: 0, maxValue: 1 },
  gamepad: {},
};
const setup = (): Parameters<typeof handleCustomActionToggles>[0] => ({
  config: { customActions: [binding], selectedGamepadId: null },
  pressedKeys: new Set<string>(),
  gamepad: null,
  state: new Map<string, { pressed: boolean; actionId: string }>(),
});
afterEach(() => {
  vi.clearAllMocks();
  transport.connected = true;
});

it('sends one press and one release, leaving repeat scheduling to the ROV', () => {
  const args = setup();
  args.pressedKeys.add('KeyD');
  handleCustomActionToggles(args);
  handleCustomActionToggles(args);
  expect(transport.invoke).toHaveBeenCalledExactlyOnceWith('dispenser.dispense', 'press');
  args.pressedKeys.clear();
  handleCustomActionToggles(args);
  expect(transport.invoke).toHaveBeenLastCalledWith('dispenser.dispense', 'release');
});
it('does not reactivate a held key when reconnecting', () => {
  const args = setup();
  transport.connected = false;
  args.pressedKeys.add('KeyD');
  handleCustomActionToggles(args);
  transport.connected = true;
  handleCustomActionToggles(args);
  expect(transport.invoke).not.toHaveBeenCalled();
});
it('releases an active input when its binding is deleted', () => {
  const args = setup();
  args.pressedKeys.add('KeyD');
  handleCustomActionToggles(args);
  args.config.customActions = [];
  handleCustomActionToggles(args);
  expect(transport.invoke).toHaveBeenLastCalledWith('dispenser.dispense', 'release');
  expect(args.state.size).toBe(0);
});
it('releases held actions on cleanup or input suppression', () => {
  const args = setup();
  args.pressedKeys.add('KeyD');
  handleCustomActionToggles(args);
  releaseCustomActions(args.state);
  expect(transport.invoke).toHaveBeenLastCalledWith('dispenser.dispense', 'release');
});

it('sends release immediately on blur without waiting for an animation frame', () => {
  const args = setup();
  args.pressedKeys.add('KeyD');
  handleCustomActionToggles(args);
  const cleanup = setupCustomActionFocusRelease(args.state);
  try {
    globalThis.dispatchEvent(new Event('blur'));
    expect(transport.invoke).toHaveBeenLastCalledWith('dispenser.dispense', 'release');
  } finally {
    cleanup();
  }
});

it('clears held keys on blur and ignores repeats until a fresh key press', () => {
  const tracker = createKeyboardTracker();
  try {
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(tracker.pressedKeys.has('KeyD')).toBe(true);
    globalThis.dispatchEvent(new Event('blur'));
    globalThis.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD', repeat: true }));
    expect(tracker.pressedKeys.size).toBe(0);
  } finally {
    tracker.cleanup();
  }
});

/* oxlint-disable max-statements -- ordered regression covers loss, recovery and a fresh press */
it('requires a held input to be released before it can restart after losing focus', () => {
  const args = setup();
  args.pressedKeys.add('KeyD');
  handleCustomActionToggles(args);
  const cleanup = setupCustomActionFocusRelease(args.state);
  try {
    globalThis.dispatchEvent(new Event('blur'));
    handleCustomActionToggles(args);
    globalThis.dispatchEvent(new Event('focus'));
    handleCustomActionToggles(args);
    expect(transport.invoke.mock.calls).toEqual([
      ['dispenser.dispense', 'press'],
      ['dispenser.dispense', 'release'],
    ]);
    args.pressedKeys.clear();
    handleCustomActionToggles(args);
    args.pressedKeys.add('KeyD');
    handleCustomActionToggles(args);
    expect(transport.invoke).toHaveBeenLastCalledWith('dispenser.dispense', 'press');
  } finally {
    cleanup();
  }
});

/* oxlint-enable max-statements */
