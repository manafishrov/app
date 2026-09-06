import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createListener: vi.fn(),
  createLogRecord: vi.fn(),
  invokeCommand: vi.fn(),
  recordLogSessionStart: vi.fn(),
}));

vi.mock('@/lib/log', () => ({ createLogRecord: mocks.createLogRecord }));
vi.mock('@/tauri/logSession', () => ({ recordLogSessionStart: mocks.recordLogSessionStart }));
vi.mock('@/tauri/core', () => ({
  createListener: mocks.createListener,
  invokeCommand: mocks.invokeCommand,
}));

import type { LogEntry } from '@/lib/log';

import { setupLogsListener } from '@/tauri/logs';

const isLogListener = (value: unknown): value is (entry: LogEntry) => void =>
  typeof value === 'function';

const deliverLog = (entry: LogEntry): void => {
  const [call = []]: unknown[][] = mocks.createListener.mock.calls;
  const [, listener] = call;
  if (!isLogListener(listener)) {
    throw new TypeError('Expected a registered log listener');
  }
  listener(entry);
};

describe('setupLogsListener', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each(['version lookup failed', 'session persistence failed'])(
    'keeps capturing logs when session metadata fails: %s',
    (failure) => {
      const unlisten = vi.fn();
      mocks.createListener.mockResolvedValue(unlisten);
      mocks.invokeCommand.mockResolvedValue([]);
      mocks.createLogRecord.mockResolvedValue(null);
      mocks.recordLogSessionStart.mockRejectedValue(new Error(failure));
      return setupLogsListener().then((cleanup) => {
        expect(cleanup).toBe(unlisten);
        expect(unlisten).not.toHaveBeenCalled();
        const entry: LogEntry = {
          origin: 'firmware',
          level: 'error',
          message: 'later field failure',
        };
        deliverLog(entry);
        expect(mocks.createLogRecord).toHaveBeenCalledExactlyOnceWith(entry);
        cleanup();
        expect(unlisten).toHaveBeenCalledOnce();
      });
    },
  );

  it('does not initialize backend logging when event registration fails', () => {
    mocks.createListener.mockRejectedValue(new Error('registration failed'));

    return expect(setupLogsListener())
      .rejects.toThrow('registration failed')
      .then(() => {
        expect(mocks.invokeCommand).not.toHaveBeenCalled();
        expect(mocks.createListener).toHaveBeenCalledWith('log_message', expect.any(Function), {
          rejectOnSetupFailure: true,
          warnOnly: true,
        });
      });
  });
});
