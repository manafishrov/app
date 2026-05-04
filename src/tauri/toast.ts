import { toast } from '@manafishrov/ui/toaster';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

import type { CleanupFn } from '@/tauri/core';

import { logError } from '@/lib/log';
import * as m from '@/paraglide/messages';
import { setFirmwareUpdateState, updatesStore } from '@/stores/updates';
import { FIRMWARE_UPDATE_TOAST_ID } from '@/tauri/constants';

const EVENT = 'show_toast';
const EMPTY_TOAST_ARGS: Record<string, never> = {};

type ToastKeyArgs = Record<string, string | number | boolean>;
type DynamicMessageResolver = (args?: Record<string, unknown>) => string;

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

const ToastPayloadVariant = {
  success: 'success',
  info: 'info',
  warn: 'warn',
  error: 'error',
  loading: 'loading',
} as const;

const ToastRenderType = {
  success: 'success',
  info: 'info',
  warning: 'warning',
  error: 'error',
  loading: 'loading',
} as const;

type ToastPayloadVariant = (typeof ToastPayloadVariant)[keyof typeof ToastPayloadVariant];

type ToastPayload = {
  identifier?: string;
  variant?: ToastPayloadVariant;
  content: ToastContent;
  action?: ToastAction | null;
};

type ToastRenderType = (typeof ToastRenderType)[keyof typeof ToastRenderType];

type ToastCreateOptions = {
  id?: string;
  title: string;
  type: ToastRenderType;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

const activeLoadingToasts = new Map<string, ReturnType<typeof setTimeout>>();
const LOADING_TOAST_TIMEOUT_MS = 15_000;
const noopCleanup: CleanupFn = () => Number.NaN;

const camelToSnake = (str: string): string =>
  str.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const toastTypeMap: Record<ToastPayloadVariant, ToastRenderType> = {
  success: ToastRenderType.success,
  info: ToastRenderType.info,
  warn: ToastRenderType.warning,
  error: ToastRenderType.error,
  loading: ToastRenderType.loading,
};

const isNonEmptyString = (value: string | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const isDynamicMessageResolver = (value: unknown): value is DynamicMessageResolver =>
  typeof value === 'function';

const isObjectValue = (value: unknown): value is Record<string, unknown> => value instanceof Object;

const resolveToastMessage = (
  key?: string,
  args?: ToastKeyArgs,
  fallback?: string,
): string | undefined => {
  if (!isNonEmptyString(key)) {
    return fallback;
  }

  const maybeResolver = (m as Record<string, unknown>)[key];
  if (!isDynamicMessageResolver(maybeResolver)) {
    return fallback;
  }

  try {
    const safeArgs = typeof args === 'object' ? args : EMPTY_TOAST_ARGS;
    return maybeResolver(safeArgs);
  } catch {
    return fallback;
  }
};

const clearLoadingTimeout = (toastId: string): void => {
  const timeout = activeLoadingToasts.get(toastId);
  if (typeof timeout === 'number') {
    clearTimeout(timeout);
    activeLoadingToasts.delete(toastId);
  }
};

const clearAllLoadingTimeouts = (): void => {
  for (const timeout of activeLoadingToasts.values()) {
    clearTimeout(timeout);
  }

  activeLoadingToasts.clear();
};

const createToastTitle = (content: ToastContent): string =>
  resolveToastMessage(content.messageKey, content.messageArgs, content.messageKey) ??
  content.messageKey;

const createActionLabel = (action: ToastAction | null | undefined): string => {
  const maybeLabelKey = isObjectValue(action) ? action.labelKey : '';
  const maybeLabelArgs = isObjectValue(action) ? action.labelArgs : EMPTY_TOAST_ARGS;
  return (
    resolveToastMessage(maybeLabelKey, maybeLabelArgs) ??
    resolveToastMessage('common_cancel', EMPTY_TOAST_ARGS, m.common_cancel()) ??
    m.common_cancel()
  );
};

const showInvokeActionErrorToast = (): void => {
  toast.create({
    title: resolveToastMessage(
      'toasts_failed_to_invoke_action',
      EMPTY_TOAST_ARGS,
      m.toasts_failed_to_invoke_action(),
    ),
    type: ToastRenderType.error,
  });
};

const invokeToastAction = (action: ToastAction): void => {
  if (!isNonEmptyString(action.messageType)) {
    return;
  }

  invoke(camelToSnake(action.messageType), { payload: action.payload }).catch((error: unknown) => {
    logError('Failed to invoke toast action command:', error);
    showInvokeActionErrorToast();
  });
};

const createActionHandler =
  (action: ToastAction, toastId: string): (() => void) =>
  (): void => {
    invokeToastAction(action);
    if (toastId.length > 0) {
      clearLoadingTimeout(toastId);
    }
  };

const scheduleLoadingTimeout = (toastId: string): void => {
  const timeout = setTimeout(() => {
    toast.create({
      id: toastId,
      title: resolveToastMessage(
        'toasts_operation_timed_out',
        EMPTY_TOAST_ARGS,
        m.toasts_operation_timed_out(),
      ),
      type: ToastRenderType.error,
    });
    activeLoadingToasts.delete(toastId);
  }, LOADING_TOAST_TIMEOUT_MS);

  activeLoadingToasts.set(toastId, timeout);
};

const createBaseToastOptions = (payload: ToastPayload): ToastCreateOptions => {
  const toastId = isNonEmptyString(payload.identifier) ? payload.identifier : '';
  const variant = payload.variant ?? ToastPayloadVariant.info;
  const type = toastTypeMap[variant] ?? ToastRenderType.info;
  const title = createToastTitle(payload.content);
  const options: ToastCreateOptions = { title, type, description: '' };

  if (toastId.length > 0) {
    options.id = toastId;
  }

  return options;
};

const addToastDescription = (options: ToastCreateOptions, payload: ToastPayload): void => {
  const description = resolveToastMessage(
    payload.content.descriptionKey,
    payload.content.descriptionArgs,
  );

  if (typeof description === 'string') {
    options.description = description;
  }
};

const addToastAction = (options: ToastCreateOptions, payload: ToastPayload): void => {
  if (!isObjectValue(payload.action)) {
    return;
  }

  const toastId = isNonEmptyString(options.id) ? options.id : '';

  options.action = {
    label: createActionLabel(payload.action),
    onClick: createActionHandler(payload.action, toastId),
  };
};

const createToastOptions = (payload: ToastPayload): ToastCreateOptions => {
  const options = createBaseToastOptions(payload);
  addToastDescription(options, payload);
  addToastAction(options, payload);

  return options;
};

const handleToastPayload = (payload: ToastPayload): void => {
  const toastId = isNonEmptyString(payload.identifier) ? payload.identifier : '';

  if (toastId.length > 0) {
    clearLoadingTimeout(toastId);
  }

  if (payload.variant === ToastPayloadVariant.loading && toastId.length > 0) {
    scheduleLoadingTimeout(toastId);
  }

  if (toastId === FIRMWARE_UPDATE_TOAST_ID && payload.variant === ToastPayloadVariant.success) {
    setFirmwareUpdateState({ error: null, status: 'upToDate' });
  }

  if (toastId === FIRMWARE_UPDATE_TOAST_ID && payload.variant === ToastPayloadVariant.error) {
    setFirmwareUpdateState({
      error: createToastTitle(payload.content),
      status: updatesStore.firmware.manifest ? 'available' : 'error',
    });
  }

  toast.create(createToastOptions(payload));
};

const showListenErrorToast = (): void => {
  toast.create({
    title: resolveToastMessage(
      'toasts_failed_to_listen_toast_messages',
      EMPTY_TOAST_ARGS,
      m.toasts_failed_to_listen_toast_messages(),
    ),
    type: ToastRenderType.error,
  });
};

const createCleanup =
  (unlisten: CleanupFn): CleanupFn =>
  (): void => {
    unlisten();
    clearAllLoadingTimeouts();
  };

export const setupToastListener = (): Promise<CleanupFn> =>
  listen<ToastPayload>(EVENT, ({ payload }) => {
    handleToastPayload(payload);
  })
    .catch((error: unknown): CleanupFn => {
      logError('Failed to listen to toast messages:', error);
      showListenErrorToast();
      return noopCleanup;
    })
    .then((unlisten: CleanupFn): CleanupFn => createCleanup(unlisten));
