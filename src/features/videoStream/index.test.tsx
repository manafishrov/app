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
const SIGNALING_TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 3000;
const SIGNALING_ATTEMPTS_AFTER_TIMEOUT = 2;
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

const stubPeerConnection = (): void => {
  // oxlint-disable-next-line prefer-arrow-callback -- Called with `new`, so it cannot be an arrow.
  const construct = vi.fn(function RTCPeerConnection(): object {
    return {
      addTransceiver: (): object => ({ receiver: {} }),
      close: vi.fn(),
      createOffer: (): Promise<{ sdp: string; type: 'offer' }> =>
        Promise.resolve({ sdp: 'offer', type: 'offer' }),
      setLocalDescription: (): Promise<void> => Promise.resolve(),
    };
  });
  vi.stubGlobal('RTCPeerConnection', construct);
  vi.stubGlobal('RTCRtpReceiver', { getCapabilities: (): null => null });
};

// Like a request sent over Wi-Fi to the tethered ROV: no answer until aborted.
const hangUntilAborted = (_url: string, init: RequestInit): Promise<Response> =>
  new Promise((_resolve, reject) => {
    if (init.signal) {
      init.signal.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });

it('retries a signaling request that never gets an answer', () => {
  vi.useFakeTimers();
  stubPeerConnection();
  const request = vi.fn(hangUntilAborted);
  vi.stubGlobal('fetch', request);

  dispose = render(() => <VideoStream />, host);

  return vi
    .advanceTimersByTimeAsync(0)
    .then(() => {
      expect(request).toHaveBeenCalledOnce();
      return vi.advanceTimersByTimeAsync(SIGNALING_TIMEOUT_MS + RETRY_DELAY_MS);
    })
    .then(() => {
      expect(request).toHaveBeenCalledTimes(SIGNALING_ATTEMPTS_AFTER_TIMEOUT);
    });
});
