import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invokeCommand: vi.fn() }));
vi.mock('@/tauri/core', () => ({ invokeCommand: mocks.invokeCommand, createListener: vi.fn() }));
vi.mock('@/lib/log', () => ({ logWarn: vi.fn() }));

import { capabilityStore } from '@/stores/capabilities';
import { disconnectCapabilities, invokeAction, refreshCapabilities } from '@/tauri/capabilities';

const catalog = { version: 1, readings: [], actions: [], extensions: [] };
beforeEach(() => {
  vi.clearAllMocks();
  disconnectCapabilities();
});

it('invokes built-in and extension IDs through the same operation and phase contract', () => {
  mocks.invokeCommand.mockResolvedValue(null);
  return Promise.all([
    invokeAction('rov.depthHold.set', 'press', true),
    invokeAction('dispenser.dispense', 'release'),
  ]).then(() => {
    expect(mocks.invokeCommand).toHaveBeenCalledWith(
      'request_capability',
      {
        operation: 'action.invoke',
        params: { id: 'rov.depthHold.set', phase: 'press', value: true },
      },
      { warnOnly: true },
    );
    expect(mocks.invokeCommand).toHaveBeenCalledWith(
      'request_capability',
      {
        operation: 'action.invoke',
        params: { id: 'dispenser.dispense', phase: 'release' },
      },
      { warnOnly: true },
    );
  });
});

it('ignores an old discovery result after disconnecting', () => {
  let complete: (value: unknown) => void = vi.fn();
  mocks.invokeCommand.mockReturnValue(
    new Promise((resolve) => {
      complete = resolve;
    }),
  );
  const refreshing = refreshCapabilities();
  disconnectCapabilities();
  complete(catalog);
  return refreshing.then(() => {
    expect(capabilityStore.connected).toBe(false);
  });
});

it('explains incompatible or failed discovery without marking capabilities connected', () => {
  mocks.invokeCommand.mockRejectedValue(new Error('Unsupported version'));
  return expect(refreshCapabilities())
    .rejects.toThrow('Unsupported version')
    .then(() => {
      expect(capabilityStore.connected).toBe(false);
      expect(capabilityStore.error).toContain('both support extensions V1');
    });
});
