import { listen } from '@tauri-apps/api/event';
import { createSignal, onCleanup } from 'solid-js';

import { logError } from '@/lib/log';

const [foreground, setForeground] = createSignal(true);
export { foreground };

const visibility = (): void => {
  setForeground(!document.hidden);
};
const hide = (): void => {
  setForeground(false);
};

export const useMobileLifecycle = (): void => {
  let disposed = false;
  let unlisten: (() => void) | null = null;
  visibility();
  document.addEventListener('visibilitychange', visibility);
  globalThis.addEventListener('pagehide', hide);
  globalThis.addEventListener('pageshow', visibility);
  listen<boolean>('detection-foreground', ({ payload }) => {
    setForeground(payload && !document.hidden);
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
    globalThis.removeEventListener('pageshow', visibility);
  });
};
