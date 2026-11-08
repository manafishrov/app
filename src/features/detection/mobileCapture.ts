import { createSignal } from 'solid-js';

import { logWarn } from '@/lib/log';
import { detectionStore, setDetectionStore } from '@/stores/detection';
import { submitDetectionFrame } from '@/tauri/detection';

// Inference shares the device with playback and controls. Do not queue work
// Sample the current video after completion when a slow model misses this rate.
const FRAME_INTERVAL_MS = 200;
const HEADER_BYTES = 32;
const MAX_INPUT_SIZE = 1024;
const HALF = 0.5;
const RGBA_CHANNELS = 4;
const TIMESTAMP_OFFSET = 24;
const [captureVideo, setCaptureVideo] = createSignal<HTMLVideoElement | null>(null);
const [captureReady, setCaptureReady] = createSignal(false);
export { captureVideo, captureReady };

export const registerDetectionVideo = (video: HTMLVideoElement): (() => void) => {
  setCaptureVideo(video);
  const ready = (): void => {
    if (captureVideo() === video) {
      setCaptureReady(!video.paused && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA);
    }
  };
  const waiting = (): void => {
    if (captureVideo() === video) {
      setCaptureReady(false);
    }
  };
  ready();
  video.addEventListener('playing', ready);
  video.addEventListener('loadeddata', ready);
  video.addEventListener('pause', waiting);
  video.addEventListener('waiting', waiting);
  video.addEventListener('emptied', waiting);
  return (): void => {
    video.removeEventListener('playing', ready);
    video.removeEventListener('loadeddata', ready);
    video.removeEventListener('pause', waiting);
    video.removeEventListener('waiting', waiting);
    video.removeEventListener('emptied', waiting);
    if (captureVideo() === video) {
      setCaptureVideo(null);
      setCaptureReady(false);
    }
  };
};

export type CaptureSize = {
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
};

const validateCaptureSize = (size: CaptureSize): void => {
  if (
    ![size.sourceWidth, size.sourceHeight, size.width, size.height].every(
      (value) => Number.isInteger(value) && value > 0,
    ) ||
    size.width > MAX_INPUT_SIZE ||
    size.height > MAX_INPUT_SIZE
  ) {
    throw new Error('Invalid detection capture dimensions');
  }
};

export const letterboxRect = ({
  sourceWidth,
  sourceHeight,
  width,
  height,
}: CaptureSize): {
  left: number;
  top: number;
  width: number;
  height: number;
} => {
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const scaledWidth = Math.round(sourceWidth * scale);
  const scaledHeight = Math.round(sourceHeight * scale);
  return {
    left: Math.floor((width - scaledWidth) * HALF),
    top: Math.floor((height - scaledHeight) * HALF),
    width: scaledWidth,
    height: scaledHeight,
  };
};

export const framePacket = (
  { runId, size, capturedAt }: { runId: number; size: CaptureSize; capturedAt: number },
  rgba: Uint8ClampedArray,
): Uint8Array => {
  validateCaptureSize(size);
  if (rgba.length !== size.width * size.height * RGBA_CHANNELS || !Number.isFinite(capturedAt)) {
    throw new Error('Invalid detection capture dimensions');
  }
  const bytes = new Uint8Array(HEADER_BYTES + rgba.length);
  const header = new DataView(bytes.buffer);
  for (const [index, value] of [
    runId,
    size.sourceWidth,
    size.sourceHeight,
    size.width,
    size.height,
  ].entries()) {
    header.setUint32(index * RGBA_CHANNELS, value, true);
  }
  header.setFloat64(TIMESTAMP_OFFSET, capturedAt, true);
  bytes.set(rgba, HEADER_BYTES);
  return bytes;
};

const drawVideo = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  size: CaptureSize,
): Uint8ClampedArray => {
  validateCaptureSize(size);
  Object.assign(canvas, { width: size.width, height: size.height });
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Video frame capture is unavailable in this webview');
  }
  const rect = letterboxRect(size);
  context.fillStyle = 'rgb(114, 114, 114)';
  context.fillRect(0, 0, size.width, size.height);
  // Canvas uses the displayed video orientation, including after a resize.
  context.drawImage(video, rect.left, rect.top, rect.width, rect.height);
  return context.getImageData(0, 0, size.width, size.height).data;
};

type CaptureSession = { runId: number; modelId: string; previousTime: number };
const sampleVideo = (canvas: HTMLCanvasElement, session: CaptureSession): Promise<void> => {
  const video = captureVideo();
  const model = detectionStore.models.find((item) => item.id === session.modelId);
  // Model compilation can take time. Read the newest frame after it is ready.
  if (
    (detectionStore.state !== 'connecting' && detectionStore.state !== 'running') ||
    !video ||
    !model ||
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    video.paused ||
    video.videoWidth === 0 ||
    video.videoHeight === 0 ||
    video.currentTime === session.previousTime
  ) {
    return Promise.resolve();
  }
  session.previousTime = video.currentTime;
  const size = {
    sourceWidth: video.videoWidth,
    sourceHeight: video.videoHeight,
    width: model.inputWidth,
    height: model.inputHeight,
  };
  const capturedAt = Date.now();
  const rgba = drawVideo(canvas, video, size);
  return submitDetectionFrame(framePacket({ runId: session.runId, size, capturedAt }, rgba));
};

/** Acknowledgement gates the next readback. There is no queue of old frames. */
export const createFramePump = (
  sample: () => Promise<void>,
  isCurrent: () => boolean,
): (() => void) => {
  let stopped = false;
  let timer = 0;
  const current = (): boolean => !stopped && isCurrent() && !document.hidden;
  const tick = (): void => {
    if (!current()) {
      return;
    }
    const started = performance.now();
    Promise.resolve()
      .then(() => (current() ? sample() : Promise.resolve()))
      .then(() => {
        if (current()) {
          timer = globalThis.setTimeout(
            tick,
            Math.max(0, FRAME_INTERVAL_MS - (performance.now() - started)),
          );
        }
      })
      .catch((error: unknown) => {
        if (current()) {
          logWarn('Mobile detection capture stopped:', error);
          setDetectionStore({ state: 'error', message: String(error), frame: null });
        }
      });
  };
  tick();
  return (): void => {
    stopped = true;
    globalThis.clearTimeout(timer);
  };
};

/** Returns cancellation immediately, even with native inference in flight. */
export const startMobileCapture = (
  runId: number,
  modelId: string,
  isCurrent: () => boolean,
): (() => void) => {
  const canvas = document.createElement('canvas');
  const session = { runId, modelId, previousTime: -1 };
  const cancel = createFramePump(() => sampleVideo(canvas, session), isCurrent);
  return (): void => {
    cancel();
    canvas.width = 0;
    canvas.height = 0;
  };
};
