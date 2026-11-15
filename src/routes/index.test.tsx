// @vitest-environment happy-dom
/* oxlint-disable no-magic-numbers -- Pixel fixtures. */
import type { Component, JSXElement } from 'solid-js';

import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { setDetectionStore } from '@/stores/detection';

import { Route } from './index';

const platform = vi.hoisted(() => ({ isMobile: false }));
vi.mock('@/lib/platform', () => platform);

vi.mock('@/lib/log', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock('@/tauri', () => ({
  deactivateDirectionVector: vi.fn<() => Promise<void>>().mockResolvedValue(),
  sendDirectionVector: vi.fn<() => Promise<void>>().mockResolvedValue(),
}));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: (): object => ({
    isFullscreen: vi.fn<() => Promise<boolean>>().mockResolvedValue(false),
    onResized: vi.fn<() => Promise<() => void>>().mockResolvedValue(vi.fn()),
  }),
}));
vi.mock('@/features/videoStream', () => ({ VideoStream: (): JSXElement => <video /> }));
vi.mock('@/features/overlay', () => ({
  Overlay: (): JSXElement => <div data-testid='overlay' />,
}));
vi.mock('@/features/touchControls', () => ({
  TouchControls: (): JSXElement => <div data-testid='touch-controls' />,
}));
vi.mock('@/features/header/MobileToolbar', () => ({
  MobileToolbar: (): JSXElement => <div data-testid='mobile-toolbar' />,
}));

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The route always declares a component.
const HomePage = Route.options.component as Component;
const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};
const strokeRect = vi.fn();

beforeEach(() => {
  document.body.append(host);
  setDetectionStore('frame', null);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Drawing context fixture.
    {
      clearRect: vi.fn(),
      setTransform: vi.fn(),
      strokeRect,
      fillRect: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 30 }),
    } as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  dispose();
  host.remove();
  strokeRect.mockClear();
  vi.restoreAllMocks();
});

const cameraFrame = (): Element => {
  const frame = host.querySelector('[data-camera-frame]');
  if (!frame) {
    throw new Error('Camera frame missing');
  }
  return frame;
};

const sizeOverlay = (frame: Element): void => {
  const canvas = frame.querySelector('canvas');
  if (!canvas) {
    throw new Error('Detection overlay missing from camera frame');
  }
  Object.defineProperties(canvas, {
    clientWidth: { configurable: true, value: 640 },
    clientHeight: { configurable: true, value: 480 },
  });
};

it.each([
  { name: 'mobile', mobile: true },
  { name: 'desktop', mobile: false },
])('draws detections over the camera view on $name', ({ mobile }) => {
  platform.isMobile = mobile;
  dispose = render(() => <HomePage />, host);

  const frame = cameraFrame();
  expect(frame.querySelector('video')).not.toBeNull();
  expect(frame.querySelector('[data-testid="overlay"]')).not.toBeNull();
  sizeOverlay(frame);
  setDetectionStore('frame', {
    capturedAt: Date.now(),
    frameWidth: 640,
    frameHeight: 480,
    detections: [
      {
        trackId: 1,
        classId: 0,
        label: 'fish',
        confidence: 0.9,
        left: 0.25,
        top: 0.25,
        width: 0.5,
        height: 0.5,
      },
    ],
  });
  expect(strokeRect).toHaveBeenCalledExactlyOnceWith(160, 120, 320, 240);
  expect(host.querySelector('[data-testid="touch-controls"]') !== null).toBe(mobile);
});
