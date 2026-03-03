import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { CleanupFn } from '@/tauri/core';

import { toast } from '@manafishrov/ui/toaster';
import { logError } from '@/lib/log';

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

const camelToSnake = (str: string): string => {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

const toastTypeMap: Record<string, 'success' | 'info' | 'warning' | 'error' | 'loading'> = {
    success: 'success',
    info: 'info',
    warn: 'warning',
    error: 'error',
    loading: 'loading',
};

export const setupToastListener = async (): Promise<CleanupFn> => {
    const unlisten = await listen<ToastPayload>(EVENT, ({ payload }) => {
        const type = toastTypeMap[payload.toastType ?? 'info'] ?? 'info';
        const message = payload.message;
        const type = payload.toastType ?? 'info';

        if (payload.id && activeLoadingToasts.has(payload.id)) {
            clearTimeout(activeLoadingToasts.get(payload.id)!);
            activeLoadingToasts.delete(payload.id);
        }

        if (payload.toastType === 'loading' && payload.id) {
            const timeout = setTimeout(() => {
                toast.create({
                    title: 'Operation timed out',
                    type: 'error',
                });
                activeLoadingToasts.delete(payload.id);
            }, 15000);
            activeLoadingToasts.set(payload.id, timeout);
        }

        const toastOptions: {
            title: message,
            type,
        };

        if (payload.description !== undefined) {
            toastOptions.description = payload.description;
        }

        if (payload.cancel !== undefined && payload.cancel !== null) {
            toastOptions.action = {
                label: 'Cancel',
                onClick: () => {
                    if (payload.cancel?.type) {
                        invoke(camelToSnake(payload.cancel.type), {
                            payload: payload.cancel.payload,
                        }).catch((error) => {
                            logError('Failed to invoke cancel command:', error);
                            toast.create({
                                title: 'Failed to invoke cancel command',
                                type: 'error',
                            });
                        }
                    }
                    if (payload.id && activeLoadingToasts.has(payload.id)) {
                        clearTimeout(activeLoadingToasts.get(payload.id)!);
                        activeLoadingToasts.delete(payload.id);
                    }
                },
            };
        }

        toast.create(toastOptions);
    }).catch((error) => {
        logError('Failed to listen to toast messages:', error);
        toast.create({
            title: 'Failed to listen to toast messages',
            type: 'error',
        });
        return () => {};
    });

    return () => {
        unlisten();
        for (const timeout of activeLoadingToasts.values()) {
            clearTimeout(timeout);
        }
        activeLoadingToasts.clear();
    };
};
