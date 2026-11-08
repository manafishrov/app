/* oxlint-disable oxc/no-async-await, max-statements, no-magic-numbers -- Sequential clock and pixel regression fixtures. */
// @vitest-environment happy-dom
/* oxlint-disable no-magic-numbers -- Pixel, clock and DPR fixtures. */
import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { configStore, setConfigStore } from '@/stores/config';
import { type DetectionFrame, detectionStore, setDetectionStore } from '@/stores/detection';

import { DetectionOverlay } from './DetectionOverlay';

vi.mock('@/lib/log', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));

let cleanup: (() => void) | null = null;
let resize: ResizeObserverCallback = () => {
  throw new Error('Observer missing');
};
const context = {
  clearRect: vi.fn(),
  setTransform: vi.fn(),
  strokeRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 30 }),
};
const frame = (capturedAt = Date.now()): DetectionFrame => ({
  capturedAt,
  frameWidth: 1920,
  frameHeight: 1080,
  detections: [
    {
      trackId: 1,
      classId: 0,
      label: 'person',
      confidence: 0.8,
      left: 0.1,
      top: 0.2,
      width: 0.3,
      height: 0.4,
    },
  ],
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  vi.clearAllMocks();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Drawing context fixture.
    context as unknown as CanvasRenderingContext2D,
  );
  setConfigStore({
    ...configStore,
    detection: { ...configStore.detection, modelId: null, classFilters: {} },
  });
  setDetectionStore('frame', null);
});
afterEach(() => {
  if (cleanup) {
    cleanup();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const mount = (): HTMLCanvasElement => {
  const host = document.createElement('div');
  cleanup = render(() => <DetectionOverlay />, host);
  const canvas = host.querySelector('canvas');
  if (!canvas) {
    throw new Error('Canvas missing');
  }
  Object.defineProperties(canvas, {
    clientWidth: { configurable: true, value: 640 },
    clientHeight: { configurable: true, value: 480 },
  });
  return canvas;
};

it('draws once per result and clears exactly at the stale deadline', async () => {
  mount();
  context.clearRect.mockClear();
  setDetectionStore('frame', frame());
  expect(context.strokeRect).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(999);
  expect(context.clearRect).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(1);
  expect(context.clearRect).toHaveBeenCalledTimes(2);
  expect(context.strokeRect).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(5000);
  expect(context.clearRect).toHaveBeenCalledTimes(2);
});

it('reschedules expiration and reuses backing dimensions until size or DPR changes', async () => {
  const canvas = mount();
  const width = vi.spyOn(canvas, 'width', 'set');
  const height = vi.spyOn(canvas, 'height', 'set');
  setDetectionStore('frame', frame());
  await vi.advanceTimersByTimeAsync(500);
  setDetectionStore('frame', frame());
  setConfigStore({
    ...configStore,
    detection: { ...configStore.detection, showLabels: !configStore.detection.showLabels },
  });
  expect(width).toHaveBeenCalledOnce();
  expect(height).toHaveBeenCalledOnce();
  const paints = context.clearRect.mock.calls.length;
  await vi.advanceTimersByTimeAsync(500);
  expect(context.clearRect).toHaveBeenCalledTimes(paints);
  vi.stubGlobal('devicePixelRatio', 2);
  globalThis.dispatchEvent(new Event('resize'));
  expect(canvas.width).toBe(1280);
  expect(canvas.height).toBe(960);
  Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 480 });
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Observer callback only signals a resize.
  resize([], {} as ResizeObserver);
  expect(canvas.width).toBe(960);
  await vi.advanceTimersByTimeAsync(500);
  const expiredPaints = context.clearRect.mock.calls.length;
  await vi.advanceTimersByTimeAsync(2000);
  expect(context.clearRect).toHaveBeenCalledTimes(expiredPaints);
});

it('clears while hidden and never repaints from a disposed expiration timer', async () => {
  mount();
  setDetectionStore('frame', frame());
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  document.dispatchEvent(new Event('visibilitychange'));
  const paints = context.clearRect.mock.calls.length;
  await vi.advanceTimersByTimeAsync(1500);
  expect(context.clearRect).toHaveBeenCalledTimes(paints);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  document.dispatchEvent(new Event('visibilitychange'));
  expect(context.strokeRect).toHaveBeenCalledOnce();
  setDetectionStore('frame', frame());
  if (cleanup) {
    cleanup();
  }
  const disposedPaints = context.clearRect.mock.calls.length;
  await vi.advanceTimersByTimeAsync(2000);
  expect(context.clearRect).toHaveBeenCalledTimes(disposedPaints);
  cleanup = null;
});

it('hides newly excluded classes immediately even when inference is still in flight', () => {
  mount();
  setDetectionStore('frame', frame());
  expect(context.strokeRect).toHaveBeenCalledOnce();
  setConfigStore({
    ...configStore,
    detection: { ...configStore.detection, modelId: 'test', classFilters: { test: [] } },
  });
  expect(context.strokeRect).toHaveBeenCalledOnce();
  // Late results are also rendered through the current filter.
  setDetectionStore('frame', frame(Date.now() + 1));
  expect(context.strokeRect).toHaveBeenCalledOnce();
});

it('repaints and renews expiry when Solid merges a new result into the existing frame', async () => {
  mount();
  context.clearRect.mockClear();
  setDetectionStore('frame', frame());
  const previous = detectionStore.frame;
  await vi.advanceTimersByTimeAsync(500);
  setDetectionStore('frame', frame());
  expect(detectionStore.frame).toBe(previous);
  expect(context.strokeRect).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(500);
  expect(context.clearRect).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(500);
  expect(context.clearRect).toHaveBeenCalledTimes(3);
  expect(context.strokeRect).toHaveBeenCalledTimes(2);
});

it('does not schedule an expiration paint for an already empty overlay', async () => {
  mount();
  context.clearRect.mockClear();
  setDetectionStore('frame', { ...frame(), detections: [] });
  expect(context.clearRect).toHaveBeenCalledOnce();
  await vi.advanceTimersByTimeAsync(5000);
  expect(context.clearRect).toHaveBeenCalledOnce();
});

it('clears the entire rounded backing store at fractional pixel ratios', () => {
  const canvas = mount();
  Object.defineProperty(canvas, 'clientWidth', { configurable: true, value: 641 });
  vi.stubGlobal('devicePixelRatio', 1.5);
  setDetectionStore('frame', frame());
  const cleared = context.clearRect.mock.lastCall;
  if (!cleared) {
    throw new Error('No canvas clear');
  }
  expect(canvas.width).toBe(962);
  expect(Number(cleared[2]) * 1.5).toBeCloseTo(canvas.width);
  expect(Number(cleared[3]) * 1.5).toBeCloseTo(canvas.height);
});
