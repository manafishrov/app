import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import { toast } from '@/components/ui/Toaster';

import { logError } from '@/lib/log';

type Toast = {
  id?: string;
  toastType?: 'success' | 'info' | 'warn' | 'error' | 'loading';
  message: string;
  cancelCommand?: string;
};

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
          ...(payload.cancelCommand && {
            cancel: {
              label: 'Cancel',
              onClick: () => {
                void invoke(payload.cancelCommand!);
              },
            },
          }),
        };
      }

      const { toastType = 'message', message } = event.payload;
      const toastMethod =
        typeMethodMap[toastType as keyof typeof typeMethodMap] || toast.message;
      toastMethod(message, getToastOptions(event.payload));
    });
  } catch (error) {
    logError('Failed to listen to toast messages:', error);
  }
}

void initializeToastListener();
