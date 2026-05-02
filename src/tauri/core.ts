import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen, type Event, type UnlistenFn } from '@tauri-apps/api/event';

import { logError, logWarn } from '@/lib/log';
import * as m from '@/paraglide/messages';

export type CleanupFn = () => void;
const noop: CleanupFn = () => Number.NaN;

export class DisposableStack {
  private readonly cleanups: CleanupFn[] = [];

  add(cleanup: CleanupFn): void {
    this.cleanups.push(cleanup);
  }

  dispose(): void {
    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop();
      if (cleanup) {
        cleanup();
      }
    }
  }
}

export type ListenerOptions = {
  warnOnly?: boolean;
};

export const createListener = <Payload>(
  eventName: string,
  handler: (payload: Payload) => void,
  options?: ListenerOptions,
): Promise<UnlistenFn> =>
  listen<Payload>(eventName, (listenerEvent: Event<Payload>) => {
    try {
      handler(listenerEvent.payload);
    } catch (error) {
      const errorMsg = `Error in listener '${eventName}'`;
      if (options && options.warnOnly === true) {
        logWarn(errorMsg, error);
      } else {
        logError(errorMsg, error);
        toast.create({ title: m.toasts_listener_error({ event: eventName }), type: 'error' });
      }
    }
  }).catch((error: unknown) => {
    const errorMsg = `Failed to setup listener '${eventName}'`;
    if (options && options.warnOnly === true) {
      logWarn(errorMsg, error);
    } else {
      logError(errorMsg, error);
      toast.create({ title: m.toasts_listener_setup_failed({ event: eventName }), type: 'error' });
    }
    return noop;
  });

export const invokeCommand = <Response>(
  command: string,
  args?: Record<string, unknown>,
  options?: ListenerOptions,
): Promise<Response> =>
  invoke<Response>(command, args).catch((error: unknown) => {
    const errorMsg = `Failed to invoke '${command}'`;
    if (options && options.warnOnly === true) {
      logWarn(errorMsg, error);
    } else {
      logError(errorMsg, error);
      toast.create({ title: m.toasts_invoke_failed({ command }), type: 'error' });
    }
    throw error;
  });
