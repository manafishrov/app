import { logWarn } from '@/lib/log';
import { setDetectionStore } from '@/stores/detection';

const FRAME_INTERVAL_MS = 200;
const MAX_FRAME_INTERVAL_MS = 2000;
const PROCESSING_HEADROOM = 1.25;
const LATENCY_SMOOTHING = 0.2;

type FrameClock = { request: (tick: () => void, delay: number) => void; cancel: () => void };
const createFrameClock = (video: HTMLVideoElement | null, current: () => boolean): FrameClock => {
  let timer = 0;
  let callback: number | null = null;
  return {
    request: (tick: () => void, delay: number): void => {
      timer = globalThis.setTimeout(() => {
        if (!current()) {
          return;
        }
        if (video && typeof video.requestVideoFrameCallback === 'function') {
          callback = video.requestVideoFrameCallback(() => {
            callback = null;
            tick();
          });
        } else {
          tick();
        }
      }, delay);
    },
    cancel: (): void => {
      globalThis.clearTimeout(timer);
      if (callback !== null && video) {
        video.cancelVideoFrameCallback(callback);
      }
    },
  };
};

/** One acknowledged inference at a time; request the newest decoded frame only
 * when due. Timers sample currentTime on webviews without video callbacks. */
export const createFramePump = (
  sample: () => Promise<void>,
  isCurrent: () => boolean,
  video: HTMLVideoElement | null = null,
): (() => void) => {
  let stopped = false;
  let averageLatency = 0;
  const current = (): boolean => !stopped && isCurrent() && !document.hidden;
  const clock = createFrameClock(video, current);
  const tick = (): void => {
    if (!current()) {
      return;
    }
    const started = performance.now();
    Promise.resolve()
      .then(() => (current() ? sample() : Promise.resolve()))
      .then(() => {
        if (!current()) {
          return;
        }
        const duration = performance.now() - started;
        averageLatency =
          averageLatency === 0
            ? duration
            : averageLatency * (1 - LATENCY_SMOOTHING) + duration * LATENCY_SMOOTHING;
        const interval = Math.min(
          MAX_FRAME_INTERVAL_MS,
          Math.max(FRAME_INTERVAL_MS, averageLatency * PROCESSING_HEADROOM),
        );
        // Leave at least 20% idle after slow requests, even beyond the rate cap.
        const delay = Math.max(interval - duration, duration * (PROCESSING_HEADROOM - 1));
        clock.request(tick, delay);
      })
      .catch((error: unknown) => {
        if (current()) {
          logWarn('Mobile detection capture stopped:', error);
          setDetectionStore({ state: 'error', message: String(error), frame: null });
        }
      });
  };
  clock.request(tick, 0);
  return (): void => {
    stopped = true;
    clock.cancel();
  };
};
