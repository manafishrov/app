// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { configStore, defaultConfig, setConfigStore } from '@/stores/config';
import { detectionStore, setDetectionStore } from '@/stores/detection';
import {
  type DetectionEvent,
  listDetectionModels,
  startDetection,
  stopDetection,
} from '@/tauri/detection';

import { createDetectionController, toggleObjectDetection } from './controller';
import { registerDetectionVideo } from './mobileCapture';

const platform = vi.hoisted(() => ({ isMobile: false }));
vi.mock('@/lib/platform', () => platform);

vi.mock('@/lib/log', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(vi.fn()) }));
vi.mock('@/tauri/config', () => ({
  setConfig: vi.fn().mockImplementation(() => Promise.resolve()),
}));
vi.mock('@/tauri/detection', () => ({
  detectionStreamUrl: (address: string): string => `rtsp://${address}:8554/cam`,
  listDetectionModels: vi.fn().mockResolvedValue([]),
  startDetection: vi.fn<typeof startDetection>().mockResolvedValue(),
  stopDetection: vi.fn<typeof stopDetection>().mockResolvedValue(),
}));

const RESTART_WAIT_MS = 500;
const BURST_WAIT_MS = 200;
const CONFIDENCE = 0.6;
const RESUMED_SESSION_COUNT = 2;
const HAVE_CURRENT_DATA = 2;
const host = document.createElement('div');
const cleanups: (() => void)[] = [];
const running: DetectionEvent = {
  type: 'status',
  state: 'running',
  message: null,
  executionProvider: 'cpu',
};

const configure = (enabled: boolean, modelId = 'first'): void => {
  setConfigStore({ ...defaultConfig, detection: { ...defaultConfig.detection, enabled, modelId } });
};

const mount = (): void => {
  cleanups.push(
    render(() => {
      createDetectionController();
      return null;
    }, host),
  );
};

const lastReceiver = (): ((event: DetectionEvent) => void) => {
  const call = vi.mocked(startDetection).mock.lastCall;
  if (!call) {
    throw new Error('Detection has not started');
  }
  return call[1];
};

const resolverNotInitialized = (): never => {
  throw new Error('Promise resolver was not initialized');
};

const createDeferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolvePromise: () => void = resolverNotInitialized;
  const promise = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
};

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(HTMLMediaElement, 'HAVE_CURRENT_DATA', {
    value: HAVE_CURRENT_DATA,
    configurable: true,
  });
  vi.clearAllMocks();
  platform.isMobile = false;
  configure(true);
  setDetectionStore({ state: 'stopped', frame: null });
});

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) {
    cleanup();
  }
  vi.useRealTimers();
});

it('ignores old channel events immediately on a settings change and after disabling', () => {
  mount();
  return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS).then(() => {
    const previous = lastReceiver();
    previous(running);
    expect(detectionStore.state).toBe('running');
    configure(true, 'second');
    previous(running);
    expect(detectionStore.state).toBe('stopped');
    return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS).then(() => {
      const current = lastReceiver();
      current(running);
      configure(false);
      current(running);
      expect(detectionStore.state).toBe('stopped');
    });
  });
});

it('waits for an in-flight start before stopping it', () => {
  const pending = createDeferred();
  vi.mocked(startDetection).mockReturnValueOnce(pending.promise);
  mount();
  return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS).then(() => {
    configure(false);
    return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS).then(() => {
      expect(stopDetection).not.toHaveBeenCalled();
      pending.resolve();
      return vi.advanceTimersByTimeAsync(0).then(() => {
        expect(stopDetection).toHaveBeenCalledOnce();
      });
    });
  });
});

it('coalesces a burst of option changes into one start using the latest options', () => {
  mount();
  return vi.advanceTimersByTimeAsync(BURST_WAIT_MS).then(() => {
    setConfigStore({
      ...defaultConfig,
      detection: { ...configStore.detection, confidenceThreshold: CONFIDENCE },
    });
    return vi.advanceTimersByTimeAsync(BURST_WAIT_MS).then(() => {
      expect(startDetection).not.toHaveBeenCalled();
      return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS).then(() => {
        expect(startDetection).toHaveBeenCalledOnce();
        expect(startDetection).toHaveBeenCalledWith(
          expect.objectContaining({ confidenceThreshold: CONFIDENCE }),
          expect.any(Function),
        );
      });
    });
  });
});

it('waits for a mounted mobile video before starting an enabled imported config', () => {
  platform.isMobile = true;
  mount();
  return vi
    .advanceTimersByTimeAsync(RESTART_WAIT_MS)
    .then(() => {
      expect(listDetectionModels).toHaveBeenCalledOnce();
      expect(startDetection).not.toHaveBeenCalled();
      const video = document.createElement('video');
      Object.defineProperties(video, {
        paused: { value: false },
        readyState: { value: HAVE_CURRENT_DATA },
      });
      const unregister = registerDetectionVideo(video);
      cleanups.push(unregister);
      return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS);
    })
    .then(() => {
      expect(startDetection).toHaveBeenCalledOnce();
      globalThis.dispatchEvent(new Event('pagehide'));
      return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS);
    })
    .then(() => {
      expect(detectionStore.state).toBe('paused');
      globalThis.dispatchEvent(new Event('pageshow'));
      return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS);
    })
    .then(() => {
      expect(startDetection).toHaveBeenCalledTimes(RESUMED_SESSION_COUNT);
      const { calls } = vi.mocked(startDetection).mock;
      const [first, second] = calls;
      if (!first || !second) {
        throw new Error('Expected two capture sessions');
      }
      expect(first[0].runId).not.toEqual(second[0].runId);
    });
});

it('lets mobile input toggle detection using the existing config command', () => {
  platform.isMobile = true;
  return expect(toggleObjectDetection()).resolves.toBeUndefined();
});

it('releases the mobile worker while playback buffers and restarts on playing', () => {
  platform.isMobile = true;
  const video = document.createElement('video');
  Object.defineProperties(video, {
    paused: { value: false },
    readyState: { value: HAVE_CURRENT_DATA },
  });
  const unregister = registerDetectionVideo(video);
  mount();
  cleanups.push(unregister);
  return vi
    .advanceTimersByTimeAsync(RESTART_WAIT_MS)
    .then(() => {
      expect(startDetection).toHaveBeenCalledOnce();
      video.dispatchEvent(new Event('waiting'));
      return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS);
    })
    .then(() => {
      expect(detectionStore.state).toBe('paused');
      expect(stopDetection).toHaveBeenCalledOnce();
      video.dispatchEvent(new Event('playing'));
      return vi.advanceTimersByTimeAsync(RESTART_WAIT_MS);
    })
    .then(() => {
      expect(startDetection).toHaveBeenCalledTimes(RESUMED_SESSION_COUNT);
    });
});
