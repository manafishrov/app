import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

type Cancel = {
  command: string;
  payload?: Record<string, unknown>;
};

type Toast = {
  id?: string;
  toastType?: 'success' | 'info' | 'warn' | 'error' | 'loading';
  message: string;
  description?: string;
  cancel?: Cancel;
};

const activeLoadingToasts = new Map<string, NodeJS.Timeout>();

function useToastListener() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void (async () => {
      try {
        unlisten = await listen<Toast>('show_toast', ({ payload }) => {
          const typeMethodMap = {
            success: toast.success,
            info: toast.info,
            warn: toast.warning,
            error: toast.error,
            loading: toast.loading,
          } as const;

          function getToastOptions(payload: Toast) {
            return {
              id: payload.id,
              description: payload.description,
              ...(payload.cancel !== undefined
                ? {
                    cancel:
                      payload.cancel === null
                        ? undefined
                        : {
                            label: 'Cancel',
                            onClick: async (event: React.MouseEvent) => {
                              event.preventDefault();
                              if (payload.cancel?.command) {
                                try {
                                  await invoke(
                                    camelToSnake(payload.cancel.command),
                                    { payload: payload.cancel.payload },
                                  );
                                } catch (error) {
                                  logError(
                                    'Failed to invoke cancel command:',
                                    error,
                                  );
                                  toast.error(
                                    'Failed to invoke cancel command',
                                  );
                                }
                              }
                              if (
                                payload.id &&
                                activeLoadingToasts.has(payload.id)
                              ) {
                                clearTimeout(
                                  activeLoadingToasts.get(payload.id),
                                );
                                activeLoadingToasts.delete(payload.id);
                              }
                            },
                          },
                  }
                : {}),
            };
          }

          const { id, toastType = 'message', message } = payload;
          const toastMethod =
            typeMethodMap[toastType as keyof typeof typeMethodMap] ||
            toast.message;

          if (id && activeLoadingToasts.has(id)) {
            clearTimeout(activeLoadingToasts.get(id));
            activeLoadingToasts.delete(id);
          }

          if (toastType === 'loading' && id) {
            const timeout = setTimeout(() => {
              toast.error('Operation timed out', {
                id,
                description: undefined,
                cancel: undefined,
              });
              activeLoadingToasts.delete(id);
            }, 15000);
            activeLoadingToasts.set(id, timeout);
          }

          toastMethod(message, getToastOptions(payload));
        });
      } catch (error) {
        logError('Failed to listen to toast messages:', error);
        toast.error('Failed to listen to toast messages');
      }
    })();
    return () => {
      if (unlisten) unlisten();

      for (const timeout of activeLoadingToasts.values()) {
        clearTimeout(timeout);
      }
      activeLoadingToasts.clear();
    };
  }, []);
}

export { useToastListener };
