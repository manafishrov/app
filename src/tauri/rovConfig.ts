import { createSignal } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { setRovConfigStore, type RovConfig } from '@/stores/rovConfig';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'rov_config_received';
const CONFIG_RESPONSE_TIMEOUT_MS = 5000;

const resolveVoid: () => void = () => 0;
const noopCancel: (error: Error) => void = () => 0;
const [rovConfigRevision, setRovConfigRevision] = createSignal(0);

type ConfigResponse = {
  mutationId?: string;
  config: RovConfig;
};

type ConfigWaiter = {
  resolve: (config: RovConfig) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof globalThis.setTimeout>;
  beforeConfirm: (config: RovConfig) => Promise<void>;
};

const configWaiters = new Map<string, ConfigWaiter>();
let mutationTail: Promise<unknown> = Promise.resolve();

const confirmConfigWaiter = (waiter: ConfigWaiter, config: RovConfig, mutationId: string): void => {
  waiter
    .beforeConfirm(config)
    .then(() => invokeCommand('confirm_rov_config', { mutationId }))
    .then(() => {
      waiter.resolve(config);
    })
    .catch((error: unknown) => {
      waiter.reject(error instanceof Error ? error : new Error(String(error)));
    });
};

const takeConfigWaiter = (mutationId: string): ConfigWaiter | undefined => {
  const waiter = configWaiters.get(mutationId);
  if (waiter) {
    globalThis.clearTimeout(waiter.timeout);
    configWaiters.delete(mutationId);
  }
  return waiter;
};

const applyRemoteRovConfig = (response: ConfigResponse): void => {
  const { config, mutationId } = response;
  setRovConfigStore(config);
  setRovConfigRevision((revision) => revision + 1);
  if (typeof mutationId !== 'string' || mutationId === '') {
    return;
  }
  const waiter = takeConfigWaiter(mutationId);
  if (!waiter) {
    return;
  }
  confirmConfigWaiter(waiter, config, mutationId);
};

type PendingConfig = {
  promise: Promise<RovConfig>;
  cancel: (error: Error) => void;
};

const waitForRemoteConfig = (
  mutationId: string,
  beforeConfirm: (config: RovConfig) => Promise<void>,
): PendingConfig => {
  let cancel = noopCancel;
  const promise = new Promise<RovConfig>((resolve, reject) => {
    const timeout = globalThis.setTimeout(() => {
      configWaiters.delete(mutationId);
      reject(new Error('Timed out waiting for the ROV to confirm its configuration'));
    }, CONFIG_RESPONSE_TIMEOUT_MS);
    const waiter: ConfigWaiter = {
      resolve,
      reject,
      timeout,
      beforeConfirm,
    };
    configWaiters.set(mutationId, waiter);
    cancel = (error: Error): void => {
      if (!configWaiters.delete(mutationId)) {
        return;
      }
      globalThis.clearTimeout(waiter.timeout);
      waiter.reject(error);
    };
  });
  return { promise, cancel };
};

type MutationOptions = {
  beforeConfirm?: (config: RovConfig) => Promise<void>;
};

const runConfirmedMutation = (
  send: (mutationId: string) => Promise<unknown>,
  options: MutationOptions,
): Promise<void> => {
  const mutationId = globalThis.crypto.randomUUID();
  const pending = waitForRemoteConfig(
    mutationId,
    options.beforeConfirm ?? ((): Promise<void> => Promise.resolve()),
  );
  const sent = send(mutationId).catch((error: unknown) => {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    pending.cancel(resolvedError);
    throw resolvedError;
  });
  return Promise.all([sent, pending.promise]).then(resolveVoid);
};

const enqueueMutation = (
  send: (mutationId: string) => Promise<unknown>,
  options: MutationOptions = {},
): Promise<void> => {
  const mutation = mutationTail.then(
    () => runConfirmedMutation(send, options),
    () => runConfirmedMutation(send, options),
  );
  mutationTail = mutation.catch(resolveVoid);
  return mutation;
};

export const setupRovConfigListener = (): Promise<() => void> =>
  createListener<ConfigResponse>(EVENT, applyRemoteRovConfig);

export const requestRovConfig = (): Promise<void> | undefined => {
  if (!connectionStatusStore.isConnected) {
    return;
  }

  return invokeCommand('request_rov_config');
};

export const setRovConfig = (
  newConfigOptions: Partial<RovConfig>,
  options: MutationOptions = {},
): Promise<void> =>
  enqueueMutation(
    (mutationId) => invokeCommand('set_rov_config', { payload: newConfigOptions, mutationId }),
    options,
  );

export const importRovConfig = (payload: unknown): Promise<void> =>
  enqueueMutation((mutationId) => invokeCommand('import_rov_config', { payload, mutationId }));

export { rovConfigRevision };
