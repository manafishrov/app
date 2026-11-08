// @vitest-environment happy-dom
/* oxlint-disable no-magic-numbers -- Pixel and wire-format fixtures. */
import { afterEach, expect, it, vi } from 'vitest';

import { detectionStore, setDetectionStore } from '@/stores/detection';
import { type DetectionModelInfo, submitDetectionFrame } from '@/tauri/detection';

import {
  createFramePump,
  framePacket,
  letterboxRect,
  registerDetectionVideo,
  startMobileCapture,
} from './mobileCapture';

vi.mock('@/lib/log', () => ({ logWarn: vi.fn() }));
vi.mock('@/tauri/detection', () => ({ submitDetectionFrame: vi.fn() }));
const noPendingFrame = (): never => {
  throw new Error('No pending frame');
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const testModel: DetectionModelInfo = {
  id: 'test',
  name: 'Test',
  fileSize: 1,
  importedAt: 1,
  inputWidth: 1,
  inputHeight: 1,
  classes: [],
  description: null,
  author: null,
  license: null,
};

it('captures the newest video only after model loading finishes', () => {
  vi.useFakeTimers();
  const video = document.createElement('video');
  Object.defineProperties(video, {
    paused: { value: false },
    readyState: { value: 2 },
    videoWidth: { value: 1280 },
    videoHeight: { value: 720 },
  });
  const context = {
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray([10, 20, 30, 255]) }),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Canvas mock implements the capture methods.
    context as unknown as CanvasRenderingContext2D,
  );
  vi.mocked(submitDetectionFrame).mockResolvedValue();
  setDetectionStore({ state: 'loading', models: [testModel] });
  const unregister = registerDetectionVideo(video);
  const cancel = startMobileCapture(7, 'test', () => true);
  return vi
    .advanceTimersByTimeAsync(2000)
    .then(() => {
      expect(context.drawImage).not.toHaveBeenCalled();
      setDetectionStore('state', 'connecting');
      return vi.advanceTimersByTimeAsync(200);
    })
    .then(() => {
      expect(context.drawImage).toHaveBeenCalledOnce();
      expect(submitDetectionFrame).toHaveBeenCalledOnce();
      cancel();
      unregister();
    });
});

it('letterboxes landscape and rotated portrait frames in source coordinates', () => {
  expect(letterboxRect({ sourceWidth: 1920, sourceHeight: 1080, width: 640, height: 640 })).toEqual(
    { left: 0, top: 140, width: 640, height: 360 },
  );
  expect(letterboxRect({ sourceWidth: 1080, sourceHeight: 1920, width: 640, height: 640 })).toEqual(
    { left: 140, top: 0, width: 360, height: 640 },
  );
});

it('sends bounded binary pixels with original dimensions and a session identifier', () => {
  const bytes = framePacket(
    {
      runId: 7,
      size: { sourceWidth: 1920, sourceHeight: 1080, width: 1, height: 1 },
      capturedAt: 1234,
    },
    new Uint8ClampedArray([10, 20, 30, 255]),
  );
  const header = new DataView(bytes.buffer);
  expect(header.getUint32(0, true)).toBe(7);
  expect(header.getUint32(4, true)).toBe(1920);
  expect(header.getUint32(8, true)).toBe(1080);
  expect(header.getFloat64(24, true)).toBe(1234);
  expect(bytes.slice(32)).toEqual(new Uint8Array([10, 20, 30, 255]));
  expect(() =>
    framePacket(
      {
        runId: 1,
        size: { sourceWidth: 1, sourceHeight: 1, width: 100_000, height: 1 },
        capturedAt: 1234,
      },
      new Uint8ClampedArray(),
    ),
  ).toThrow();
});

it('drops sampling opportunities during slow inference and cancels an outstanding request', () => {
  vi.useFakeTimers();
  let acknowledge: () => void = noPendingFrame;
  const sample = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        acknowledge = resolve;
      }),
  );
  const cancel = createFramePump(sample, () => true);
  return vi
    .advanceTimersByTimeAsync(2000)
    .then(() => {
      expect(sample).toHaveBeenCalledOnce();
      acknowledge();
      return vi.advanceTimersByTimeAsync(200);
    })
    .then(() => {
      expect(sample).toHaveBeenCalledTimes(2);
      cancel();
      acknowledge();
      return vi.advanceTimersByTimeAsync(2000);
    })
    .then(() => {
      expect(sample).toHaveBeenCalledTimes(2);
    });
});

it('stops after a capture failure and makes the error visible', () => {
  vi.useFakeTimers();
  const sample = vi.fn().mockRejectedValue(new Error('Canvas readback failed'));
  const cancel = createFramePump(sample, () => true);
  return vi.advanceTimersByTimeAsync(2000).then(() => {
    expect(sample).toHaveBeenCalledOnce();
    expect(detectionStore.message).toContain('Canvas readback failed');
    cancel();
  });
});
