import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createListener: vi.fn(),
  createLogRecord: vi.fn(),
  invokeCommand: vi.fn(),
}));

vi.mock('@/lib/log', () => ({ createLogRecord: mocks.createLogRecord }));
vi.mock('@/tauri/core', () => ({
  createListener: mocks.createListener,
  invokeCommand: mocks.invokeCommand,
}));

import { setupLogsListener } from '@/tauri/logs';

describe('setupLogsListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
