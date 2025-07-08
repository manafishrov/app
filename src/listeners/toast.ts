import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

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

async function initializeToastListener() {
  try {
    await listen<Toast>('toast', (event) => {
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
                        onClick: () => {
                          if (payload.cancel?.command) {
                            try {
                              void invoke(
                                payload.cancel.command,
                                payload.cancel.payload,
                              );
                            } catch (error) {
                              logError(
                                'Failed to invoke cancel command:',
                                error,
                              );
                              toast.error('Failed to invoke cancel command');
                            }
                          }
                        },
                      },
              }
            : {}),
        };
      }

      const { id, toastType = 'message', message } = event.payload;
      const toastMethod =
        typeMethodMap[toastType as keyof typeof typeMethodMap] || toast.message;

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

      toastMethod(message, getToastOptions(event.payload));
    });
  } catch (error) {
    logError('Failed to listen to toast messages:', error);
    toast.error('Failed to initialize toast listener');
  }
}

void initializeToastListener();
