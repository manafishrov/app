// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';

import { setRecordingStore } from '@/stores/recording';

import { OverlayPreviewProvider } from './OverlayPreview';
import { RecordingIndicator } from './RecordingIndicator';

const ELAPSED_TIME_MS = 61_000;
const host = document.createElement('div');
const [undef] = [] as undefined[];
let dispose: (() => void) | undefined = undef;

afterEach(() => {
  if (dispose) {
    dispose();
  }
  host.replaceChildren();
  setRecordingStore({ isRecording: false });
  vi.useRealTimers();
});

it('hides the camera indicator when idle and shows elapsed time only while recording', () => {
  vi.useFakeTimers();
  dispose = render(() => <RecordingIndicator />, host);
  expect(host.querySelector('.hidden')).not.toBeNull();
  setRecordingStore({ isRecording: true, startTime: Date.now() });
  expect(host.querySelector('.hidden')).toBeNull();
  // Cross a minute boundary to exercise the displayed timer, not just visibility.
  vi.advanceTimersByTime(ELAPSED_TIME_MS);
  expect(host.textContent).toContain('01:01');
  setRecordingStore({ isRecording: false });
  expect(host.querySelector('.hidden')).not.toBeNull();
});

it('shows a recording sample while arranging the camera layout', () => {
  dispose = render(
    () => (
      <OverlayPreviewProvider>
        <RecordingIndicator />
      </OverlayPreviewProvider>
    ),
    host,
  );
  expect(host.querySelector('.hidden')).toBeNull();
  expect(host.textContent).toContain('00:00');
});

it('keeps a recording sample available in the widget gallery', () => {
  dispose = render(
    () => (
      <OverlayPreviewProvider palette>
        <RecordingIndicator />
      </OverlayPreviewProvider>
    ),
    host,
  );
  expect(host.querySelector('.hidden')).toBeNull();
  expect(host.textContent).toContain('00:00');
  expect(host.textContent).not.toContain('Standby');
});
