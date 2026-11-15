import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: vi.fn() } }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/path', () => ({
  appCacheDir: (): Promise<string> => Promise.resolve('/cache'),
  join: (...parts: string[]): Promise<string> => Promise.resolve(parts.join('/')),
}));
vi.mock('@tauri-apps/plugin-fs', () => ({ mkdir: vi.fn(), readDir: vi.fn() }));
vi.mock('@/lib/log', () => ({ logError: vi.fn(), logInfo: vi.fn() }));
vi.mock('@/lib/platform', () => ({ isMobile: false }));
vi.mock('@/paraglide/messages', () => ({}));
vi.mock('@/stores/config', () => ({ configStore: { videoDirectory: '/videos' } }));
vi.mock('@/stores/recording', () => ({ setRecordingStore: vi.fn() }));
vi.mock('@/tauri/core', () => ({ invokeCommand: vi.fn() }));

import { createRecordingPath } from '@/tauri/recording';

// Pacific Standard Time, eight hours behind UTC.
const PST_OFFSET_MINUTES = 480;

describe('recording file names', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('use the local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T13:03:29.456Z'));
    vi.spyOn(Date.prototype, 'getTimezoneOffset').mockReturnValue(PST_OFFSET_MINUTES);

    return createRecordingPath('video/mp4').then((path) => {
      expect(path).toBe('/videos/Recording_2026-11-15_05-03-29_temp.mp4');
    });
  });
});
