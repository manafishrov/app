import type { ActionPhase, CapabilityValue } from '@/stores/capabilityTypes';

import { logWarn } from '@/lib/log';
import {
  receiveCapabilityCatalog,
  receiveCapabilitySamples,
  resetCapabilities,
  setCapabilityError,
} from '@/stores/capabilities';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { createListener, invokeCommand, type CleanupFn } from '@/tauri/core';

export const requestCapability = (
  operation: string,
  params: Record<string, CapabilityValue>,
): Promise<unknown> =>
  invokeCommand('request_capability', { operation, params }, { warnOnly: true });

const [undef] = [] as undefined[];
const ignoreResult: () => void = () => 0;

export const invokeAction = (
  id: string,
  phase: ActionPhase = 'press',
  value?: CapabilityValue,
): Promise<void> =>
  requestCapability('action.invoke', value === undef ? { id, phase } : { id, phase, value }).then(
    ignoreResult,
  );

export const importExtensionSource = (): Promise<string | null> =>
  invokeCommand('import_extension_source');
export const saveCsv = (name: string): Promise<boolean> => invokeCommand('save_csv', { name });

let generation = 0;
export const refreshCapabilities = (): Promise<void> => {
  const current = generation;
  return requestCapability('catalog.get', {})
    .then((catalog) => {
      if (generation === current) {
        receiveCapabilityCatalog(catalog);
      }
    })
    .catch((error: unknown) => {
      if (generation === current) {
        setCapabilityError(
          `Could not load ROV capabilities. Ensure the app and firmware both support extensions V1. ${String(error)}`,
        );
      }
      throw error;
    });
};

export const disconnectCapabilities = (): void => {
  generation += 1;
  resetCapabilities();
};

export const setupCapabilityListeners = (): Promise<CleanupFn> =>
  Promise.all([
    createListener<unknown>('capability_catalog', receiveCapabilityCatalog),
    createListener<unknown>('capability_samples', receiveCapabilitySamples, { warnOnly: true }),
  ]).then((cleanups) => {
    if (connectionStatusStore.isConnected) {
      refreshCapabilities().catch((error: unknown) => {
        logWarn('Could not discover ROV capabilities', error);
      });
    }
    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
      disconnectCapabilities();
    };
  });
