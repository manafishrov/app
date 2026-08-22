import { createSignal } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { setRovConfigStore, type RovConfig } from '@/stores/rovConfig';
import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'rov_config_received';
const CONFIG_RESPONSE_TIMEOUT_MS = 5000;

const resolveVoid: () => void = () => 0;
const noopCancel: (error: Error) => void = () => 0;
const [rovConfigRevision, setRovConfigRevision] = createSignal(0);
type ConfigWaiter = {
  baselineRevision: number;
  resolve: (config: RovConfig) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof globalThis.setTimeout>;
};
const configWaiters = new Set<ConfigWaiter>();
let mutationTail: Promise<unknown> = Promise.resolve();

const applyRemoteRovConfig = (config: RovConfig): void => {
  setRovConfigStore(config);
  const revision = rovConfigRevision() + 1;
  setRovConfigRevision(revision);
  for (const waiter of configWaiters) {
    if (revision > waiter.baselineRevision) {
      globalThis.clearTimeout(waiter.timeout);
      configWaiters.delete(waiter);
      waiter.resolve(config);
    }
  }
};

type PendingConfig = {
  promise: Promise<RovConfig>;
  cancel: (error: Error) => void;
};

const waitForRemoteConfig = (baselineRevision: number): PendingConfig => {
  let cancel = noopCancel;
  const promise = new Promise<RovConfig>((resolve, reject) => {
    const waiter: ConfigWaiter = {
      baselineRevision,
      resolve,
      reject,
      timeout: 0,
    };
    waiter.timeout = globalThis.setTimeout(() => {
      configWaiters.delete(waiter);
      reject(new Error('Timed out waiting for the ROV to confirm its configuration'));
    }, CONFIG_RESPONSE_TIMEOUT_MS);
    configWaiters.add(waiter);
    cancel = (error: Error): void => {
      if (!configWaiters.delete(waiter)) {
        return;
      }
      globalThis.clearTimeout(waiter.timeout);
      waiter.reject(error);
    };
  });
  return { promise, cancel };
};

const runConfirmedMutation = (send: () => Promise<unknown>): Promise<void> => {
  const pending = waitForRemoteConfig(rovConfigRevision());
  const sent = send().catch((error: unknown) => {
    const resolvedError = error instanceof Error ? error : new Error(String(error));
    pending.cancel(resolvedError);
    throw resolvedError;
  });
  return Promise.all([sent, pending.promise]).then(resolveVoid);
};

const enqueueMutation = (send: () => Promise<unknown>): Promise<void> => {
  const mutation = mutationTail.then(
    () => runConfirmedMutation(send),
    () => runConfirmedMutation(send),
  );
  mutationTail = mutation.catch(resolveVoid);
  return mutation;
};

export const setupRovConfigListener = (): Promise<() => void> =>
  createListener<RovConfig>(EVENT, applyRemoteRovConfig);

export const requestRovConfig = (): Promise<void> | undefined => {
  if (!connectionStatusStore.isConnected) {
    return;
  }

  return invokeCommand('request_rov_config');
};

export const setRovConfig = (newConfigOptions: Partial<RovConfig>): Promise<void> =>
  enqueueMutation(() => invokeCommand('set_rov_config', { payload: newConfigOptions }));

export const importRovConfig = (payload: unknown): Promise<void> =>
  enqueueMutation(() => invokeCommand('import_rov_config', { payload }));

export { rovConfigRevision };
