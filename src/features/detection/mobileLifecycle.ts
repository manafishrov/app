import { listen } from '@tauri-apps/api/event';
import { createSignal, onCleanup } from 'solid-js';

import { logError } from '@/lib/log';

const [foreground, setForeground] = createSignal(true);
const [resumeGeneration, setResumeGeneration] = createSignal(0);
export { foreground, resumeGeneration };

const visibility = (): void => {
  setForeground(!document.hidden);
};
const hide = (): void => {
  setForeground(false);
};
const resume = (): void => {
  visibility();
  setResumeGeneration((generation) => generation + 1);
};

export const useMobileLifecycle = (): void => {
  let disposed = false;
  let unlisten: (() => void) | null = null;
  visibility();
  document.addEventListener('visibilitychange', visibility);
  globalThis.addEventListener('pagehide', hide);
  globalThis.addEventListener('pageshow', resume);
  listen<boolean>('detection-foreground', ({ payload }) => {
    setForeground(payload && !document.hidden);
    // Native suspension releases the session even if the webview missed hide.
    if (payload) {
      setResumeGeneration((generation) => generation + 1);
    }
  })
    .then((cleanup) => {
      if (disposed) {
        cleanup();
      } else {
        unlisten = cleanup;
      }
    })
    .catch(logError);
  onCleanup(() => {
    disposed = true;
    if (unlisten) {
      unlisten();
    }
    document.removeEventListener('visibilitychange', visibility);
    globalThis.removeEventListener('pagehide', hide);
    globalThis.removeEventListener('pageshow', resume);
  });
};
