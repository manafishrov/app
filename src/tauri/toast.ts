import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { CleanupFn } from '@/tauri/core';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';

const EVENT = 'show_toast';

type ToastKeyArgs = Record<string, string | number | boolean>;

type DynamicMessageResolver = (args?: Record<string, unknown>) => string;

const resolveToastMessage = (
  key?: string,
  args?: ToastKeyArgs,
  fallback?: string,
): string | undefined => {
  if (!key) {
    return fallback;
  }

  const maybeResolver = (m as Record<string, unknown>)[key];
  if (typeof maybeResolver !== 'function') {
    return fallback;
  }

  try {
    return (maybeResolver as DynamicMessageResolver)(args ?? {});
  } catch {
    return fallback;
  }
};

type ToastAction = {
  labelKey?: string;
  labelArgs?: ToastKeyArgs;
  messageType: string;
  payload?: unknown;
};

type ToastContent = {
  messageKey: string;
  messageArgs?: ToastKeyArgs;
  descriptionKey?: string;
  descriptionArgs?: ToastKeyArgs;
};

type ToastPayload = {
  identifier?: string;
  variant?: 'success' | 'info' | 'warn' | 'error' | 'loading';
  content: ToastContent;
  action?: ToastAction | null;
};

const activeLoadingToasts = new Map<string, ReturnType<typeof setTimeout>>();
const LOADING_TOAST_TIMEOUT_MS = 15_000;

const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toastTypeMap: Record<string, 'success' | 'info' | 'warning' | 'error' | 'loading'> = {
  success: 'success',
  info: 'info',
  warn: 'warning',
  error: 'error',
  loading: 'loading',
};

const clearLoadingTimeout = (toastId: string): void => {
  const timeout = activeLoadingToasts.get(toastId);
  if (timeout) {
    clearTimeout(timeout);
    activeLoadingToasts.delete(toastId);
  }
};

export const setupToastListener = async (): Promise<CleanupFn> => {
  const unlisten = await listen<ToastPayload>(EVENT, ({ payload }) => {
    const toastId = payload.identifier;
    const variant = payload.variant ?? 'info';
    const type = toastTypeMap[variant] ?? 'info';

    const content = payload.content;
    const title =
      resolveToastMessage(content.messageKey, content.messageArgs, content.messageKey) ??
      content.messageKey;
    const description = resolveToastMessage(
      content.descriptionKey,
      content.descriptionArgs,
      undefined,
    );
    const actionLabel =
      resolveToastMessage(payload.action?.labelKey, payload.action?.labelArgs, undefined) ??
      resolveToastMessage('common_cancel', undefined, m.common_cancel()) ??
      m.common_cancel();

    if (toastId) {
      clearLoadingTimeout(toastId);
    }

    if (variant === 'loading' && toastId) {
      const timeout = setTimeout(() => {
        toast.create({
          id: toastId,
          title: resolveToastMessage(
            'toasts_operation_timed_out',
            undefined,
            m.toasts_operation_timed_out(),
          ),
          type: 'error',
        });
        activeLoadingToasts.delete(toastId);
      }, LOADING_TOAST_TIMEOUT_MS);
      activeLoadingToasts.set(toastId, timeout);
    }

    const toastOptions: {
      id?: string;
      title: string;
      type: 'success' | 'info' | 'warning' | 'error' | 'loading';
      description?: string;
      action?:
        | {
            label: string;
            onClick: () => void;
          }
        | undefined;
    } = {
      title,
      type,
    };

    if (toastId) {
      toastOptions.id = toastId;
    }

    if (description !== undefined) {
      toastOptions.description = description;
    }

    if (payload.action) {
      toastOptions.action = {
        label: actionLabel,
        onClick: () => {
          if (payload.action && payload.action.messageType) {
            invoke(camelToSnake(payload.action.messageType), {
              payload: payload.action.payload,
            }).catch((error) => {
              logError('Failed to invoke toast action command:', error);
              toast.create({
                title: resolveToastMessage(
                  'toasts_failed_to_invoke_action',
                  undefined,
                  m.toasts_failed_to_invoke_action(),
                ),
                type: 'error',
              });
            });
          }
          if (toastId) {
            clearLoadingTimeout(toastId);
          }
        },
      };
    } else {
      toastOptions.action = undefined;
    }

    toast.create(toastOptions);
  }).catch((error) => {
    logError('Failed to listen to toast messages:', error);
    toast.create({
      title: resolveToastMessage(
        'toasts_failed_to_listen_toast_messages',
        undefined,
        m.toasts_failed_to_listen_toast_messages(),
      ),
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
