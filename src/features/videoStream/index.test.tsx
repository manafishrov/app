// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';

import { VideoStream } from './index';

vi.mock('@tanstack/solid-router', () => ({
  useLocation: (): (() => { pathname: string }) => () => ({ pathname: '/' }),
}));
vi.mock('@/lib/log', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock('@/features/detection/mobileCapture', () => ({ registerDetectionVideo: vi.fn() }));
vi.mock('@/tauri/recording', () => ({}));

const RETRY_WINDOW_MS = 10_000;
const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};

afterEach(() => {
  dispose();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('shows video as unsupported instead of crashing when WebRTC is unavailable', () => {
  vi.useFakeTimers();
  // WebKitGTK without the GStreamer webrtc plugin throws this from the constructor.
  // oxlint-disable-next-line prefer-arrow-callback -- Called with `new`, so it cannot be an arrow.
  const construct = vi.fn(function RTCPeerConnection(): never {
    throw new DOMException('The operation is not supported.', 'NotSupportedError');
  });
  vi.stubGlobal('RTCPeerConnection', construct);

  dispose = render(() => <VideoStream />, host);

  expect(host.querySelector('video')).not.toBeNull();
  expect(host.textContent).toContain('Video is not supported on this system.');
  vi.advanceTimersByTime(RETRY_WINDOW_MS);
  expect(construct).toHaveBeenCalledOnce();
});
