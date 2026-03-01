import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { CleanupFn } from '@/tauri/core';

import { toast } from '@/components/ui/Toaster';
import { logError } from '@/log';

const EVENT = 'show_toast';

type Cancel = {
  type: string;
  payload?: Record<string, unknown>;
};

type ToastPayload = {
  id?: string;
  toastType?: 'success' | 'info' | 'warn' | 'error' | 'loading';
  message: string;
  description?: string;
  cancel?: Cancel;
};

const activeLoadingToasts = new Map<string, ReturnType<typeof setTimeout>>();

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export async function setupToastListener(): Promise<CleanupFn> {
  const unlisten = await listen<ToastPayload>(EVENT, ({ payload }) => {
    const typeMethodMap = {
      success: toast.success,
      info: toast.info,
      warn: toast.warning,
      error: toast.error,
      loading: toast.loading,
    } as const;

    const { id, toastType = 'message', message } = payload;
    const toastMethod = typeMethodMap[toastType as keyof typeof typeMethodMap] || toast.message;

    if (id && activeLoadingToasts.has(id)) {
      clearTimeout(activeLoadingToasts.get(id));
      activeLoadingToasts.delete(id);
    }

    if (toastType === 'loading' && id) {
      const timeout = setTimeout(() => {
        toast.error('Operation timed out', {
          id,
        });
        activeLoadingToasts.delete(id);
      }, 15000);
      activeLoadingToasts.set(id, timeout);
    }

    const options: Parameters<typeof toastMethod>[1] = {};
    if (payload.id !== undefined) options.id = payload.id;
    if (payload.description !== undefined) options.description = payload.description;

    if (payload.cancel !== undefined && payload.cancel !== null) {
      options.cancel = {
        label: 'Cancel',
        onClick: (event) => {
          event.preventDefault();
          if (payload.cancel?.type) {
            invoke(camelToSnake(payload.cancel.type), {
              payload: payload.cancel.payload,
            }).catch((error) => {
              logError('Failed to invoke cancel command:', error);
              toast.error('Failed to invoke cancel command');
            });
          }
          if (payload.id && activeLoadingToasts.has(payload.id)) {
            clearTimeout(activeLoadingToasts.get(payload.id));
            activeLoadingToasts.delete(payload.id);
          }
        },
      };
    }

    toastMethod(message, options);
  }).catch((error) => {
    logError('Failed to listen to toast messages:', error);
    toast.error('Failed to listen to toast messages');
    return () => {};
  });

  return () => {
    unlisten();
    for (const timeout of activeLoadingToasts.values()) {
      clearTimeout(timeout);
    }
    activeLoadingToasts.clear();
  };
}
