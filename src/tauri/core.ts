import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event';

import { logError, logWarn } from '@/lib/log';

export type CleanupFn = () => void;

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

export type ListenerOptions = {
  warnOnly?: boolean;
};

export const createListener = <T>(
  event: string,
  handler: (payload: T) => void,
  options?: ListenerOptions,
): Promise<UnlistenFn> => listen<T>(event, (event: Event<T>) => {
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

export const invokeCommand = async <T>(
  command: string,
  args?: Record<string, unknown>,
  options?: ListenerOptions,
): Promise<T> => invoke<T>(command, args).catch((error) => {
    const errorMsg = `Failed to invoke '${command}'`;
    if (options?.warnOnly) {
      logWarn(errorMsg, error);
    } else {
      logError(errorMsg, error);
      toast.create({ title: errorMsg, type: 'error' });
    }
    throw error;
  });
