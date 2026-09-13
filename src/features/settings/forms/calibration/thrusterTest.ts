import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { createSignal, onCleanup, onMount, type Accessor } from 'solid-js';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { subscribeThrusterTestEnd } from '@/tauri/thrusterTest';

const CANCEL_RETRY_INTERVAL_MS = 1000;

type TestRequest = {
  index: number;
  cancelling: boolean;
  retryAfter: number;
  startCompleted: Promise<boolean>;
};
type ThrusterTest = { disabled: Accessor<boolean[]>; start: (index: number) => void };

const createCancelHandler =
  (
    active: Accessor<TestRequest | null>,
    isCurrent: (request: TestRequest) => boolean,
  ): ((event: KeyboardEvent) => void) =>
  (event): void => {
    const request = active();
    if (
      event.key !== 'Escape' ||
      event.repeat ||
      request === null ||
      request.cancelling ||
      performance.now() < request.retryAfter
    ) {
      return;
    }
    request.cancelling = true;
    // Keep Escape available until a terminal server toast arrives.
    // Rate-limit fresh presses, but allow retry if the command never reaches firmware.
    // Wait for start completion before invoking cancel; async Tauri commands can reorder.
    // This local ordering does not acknowledge motor output.
    request.startCompleted
      .then((started): Promise<unknown> | null => {
        if (started && isCurrent(request)) {
          request.retryAfter = performance.now() + CANCEL_RETRY_INTERVAL_MS;
          return invoke('cancel_thruster_test', { payload: request.index });
        }
        return null;
      })
      .catch((error: unknown): void => {
        if (!isCurrent(request)) {
          return;
        }
        request.retryAfter = 0;
        logError('Failed to cancel thruster test:', error);
        toast.create({ title: m.toasts_failed_to_cancel_thruster_test(), type: 'error' });
      })
      .finally((): void => {
        request.cancelling = false;
      });
  };

export const useThrusterTest = (count: number): ThrusterTest => {
  const [active, setActive] = createSignal<TestRequest | null>(null);
  let disposed = false;
  const isCurrent = (request: TestRequest): boolean => !disposed && active() === request;
  const cancel = createCancelHandler(active, isCurrent);

  const start = (index: number): void => {
    // Firmware cancel ignores the index and stops the global test. Do not overlap starts.
    if (disposed || active() !== null) {
      return;
    }
    // Invoke success confirms the local WebSocket write, not firmware acceptance.
    const request: TestRequest = {
      index,
      cancelling: false,
      retryAfter: 0,
      startCompleted: invoke('start_thruster_test', { payload: index })
        .then((): boolean => true)
        .catch((error: unknown): boolean => {
          if (isCurrent(request)) {
            setActive(null);
            logError('Failed to start thruster test:', error);
            toast.create({ title: m.toasts_failed_to_start_thruster_test(), type: 'error' });
          }
          return false;
        }),
    };
    setActive(request);
  };

  onMount(() => {
    // Capture sees Escape even when a focused control/dialog stops bubbling.
    // Do not consume it: normal dialog dismissal must still run.
    globalThis.addEventListener('keydown', cancel, true);
  });
  const unsubscribe = subscribeThrusterTestEnd((): void => {
    // Terminal toasts carry no request ID/index. Serialization avoids local overlap.
    // Delayed toasts or commands from other clients cannot be correlated here.
    setActive(null);
  });
  onCleanup(() => {
    disposed = true;
    globalThis.removeEventListener('keydown', cancel, true);
    unsubscribe();
  });

  return { disabled: () => Array.from({ length: count }, () => active() !== null), start };
};
