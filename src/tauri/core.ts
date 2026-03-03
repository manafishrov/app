import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event';

import { logError, logWarn } from '@/lib/log';

export type CleanupFn = () => void;

/**
 * Simple disposable stack for collecting cleanup functions.
 * Call dispose() once to clean up everything in LIFO order.
 */
export class DisposableStack {
  private cleanups: CleanupFn[] = [];

  add(cleanup: CleanupFn): void {
    this.cleanups.push(cleanup);
  }

  dispose(): void {
    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop();
      cleanup?.();
    }
  }
}

/**
 * Options for creating a Tauri event listener.
 */
export type ListenerOptions = {
  /** Only log warning on error, don't show toast */
  warnOnly?: boolean;
};

/**
 * Creates a typed Tauri event listener with consistent error handling.
 * Returns a promise that resolves to a cleanup function.
 */
export const createListener = <T>(
  event: string,
  handler: (payload: T) => void,
  options?: ListenerOptions,
): Promise<UnlistenFn> => {
  return listen<T>(event, (event: Event<T>) => {
    try {
      handler(event.payload);
    } catch (error) {
      const errorMsg = `Error in listener '${event}'`;
      if (options?.warnOnly) {
        logWarn(errorMsg, error);
      } else {
        logError(errorMsg, error);
        toast.create({ title: errorMsg, type: 'error' });
      }
    }
  }).catch((error) => {
    const errorMsg = `Failed to setup listener '${event}'`;
    if (options?.warnOnly) {
      logWarn(errorMsg, error);
    } else {
      logError(errorMsg, error);
      toast.create({ title: errorMsg, type: 'error' });
    }
    return () => {};
  });
};

/**
 * Type-safe wrapper around Tauri's invoke command with consistent error handling.
 */
export const invokeCommand = async <T>(
  command: string,
  args?: Record<string, unknown>,
  options?: ListenerOptions,
): Promise<T> => {
  return invoke<T>(command, args).catch((error) => {
    const errorMsg = `Failed to invoke '${command}'`;
    if (options?.warnOnly) {
      logWarn(errorMsg, error);
    } else {
      logError(errorMsg, error);
      toast.create({ title: errorMsg, type: 'error' });
    }
    throw error;
  });
};
