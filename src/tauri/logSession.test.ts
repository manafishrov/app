import { expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createLogRecord: vi.fn(), getVersion: vi.fn() }));
vi.mock('@/lib/log', () => ({ createLogRecord: mocks.createLogRecord }));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: mocks.getVersion }));

import { recordLogSessionStart } from '@/tauri/logSession';

const sessionDetails = (): unknown => {
  const [call = []]: unknown[][] = mocks.createLogRecord.mock.calls;
  const [entry] = call;
  expect(entry).toMatchObject({ origin: 'frontend', level: 'info' });
  if (
    typeof entry !== 'object' ||
    entry === null ||
    !('message' in entry) ||
    typeof entry.message !== 'string'
  ) {
    throw new TypeError('Expected session diagnostic');
  }
  return JSON.parse(entry.message.replace('App session started: ', '')) as unknown;
};

it('persists one session diagnostic with version, identity and clock anchors across listener restarts', () => {
  mocks.getVersion.mockResolvedValue('1.2.3');
  mocks.createLogRecord.mockResolvedValue(null);
  return Promise.all([recordLogSessionStart(), recordLogSessionStart()])
    .then(recordLogSessionStart)
    .then(() => {
      expect(mocks.getVersion).toHaveBeenCalledOnce();
      expect(mocks.createLogRecord).toHaveBeenCalledOnce();
      expect(sessionDetails()).toMatchObject({
        appVersion: '1.2.3',
        sessionId: expect.stringMatching(/^[\da-f-]{36}$/) as unknown,
        sourceUtc: expect.stringMatching(/Z$/) as unknown,
        monotonicMs: expect.any(Number) as unknown,
        monotonicOriginUnixMs: expect.any(Number) as unknown,
        monotonicClock: 'webview performance.now milliseconds',
      });
    });
});
