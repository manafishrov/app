import { getVersion } from '@tauri-apps/api/app';

import { createLogRecord } from '@/lib/log';

let sessionStart: Promise<void> | null = null;

// One session per webview lifetime, not per ROV connection. No log clearing.
export const recordLogSessionStart = (): Promise<void> => {
  if (sessionStart) {
    return sessionStart;
  }
  const sessionId = crypto.randomUUID();
  const sourceUtc = new Date().toISOString();
  const monotonicMs = performance.now();
  const monotonicOriginUnixMs = performance.timeOrigin;
  sessionStart = getVersion().then((appVersion) =>
    createLogRecord({
      origin: 'frontend',
      level: 'info',
      message: `App session started: ${JSON.stringify({
        appVersion,
        sessionId,
        sourceUtc,
        monotonicMs,
        monotonicOriginUnixMs,
        monotonicClock: 'webview performance.now milliseconds',
      })}`,
    }),
  );
  return sessionStart;
};
