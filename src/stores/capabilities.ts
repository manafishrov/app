import { batch } from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

import { logWarn } from '@/lib/log';
import { projectBuiltinSamples } from '@/stores/capabilityProjection';
import {
  capabilityCatalogSchema,
  capabilitySamplesSchema,
  type CapabilityCatalog,
  type ReadingDescriptor,
  type ReadingSample,
} from '@/stores/capabilityTypes';

export type {
  ActionDescriptor,
  ActionMode,
  ActionPhase,
  CapabilityValue,
  ExtensionDescriptor,
  ReadingDescriptor,
  ReadingSample,
} from '@/stores/capabilityTypes';

type CapabilityStore = {
  connected: boolean;
  error: string | null;
  catalog: CapabilityCatalog;
  samples: Record<string, ReadingSample>;
  receivedAt: Record<string, number>;
};
const emptyCatalog = (): CapabilityCatalog => ({
  version: 1,
  readings: [],
  actions: [],
  extensions: [],
});
const [capabilityStore, setCapabilityStore] = createStore<CapabilityStore>({
  connected: false,
  error: null,
  catalog: emptyCatalog(),
  samples: {},
  receivedAt: {},
});
export { capabilityStore };

const matchesType = (reading: ReadingDescriptor, sample: ReadingSample): boolean => {
  const { value } = sample;
  if (value === null) {
    return true;
  }
  switch (reading.valueType) {
    case 'json': {
      return true;
    }
    case 'numberArray': {
      return Array.isArray(value) && value.every((item) => typeof item === 'number');
    }
    case 'boolean':
    case 'string':
    case 'number': {
      return typeof value === reading.valueType;
    }
    default: {
      return false;
    }
  }
};

const acceptSample = (sample: ReadingSample): boolean => {
  const reading = capabilityStore.catalog.readings.find((item) => item.id === sample.id);
  if (!reading || !matchesType(reading, sample)) {
    logWarn(`Ignored unknown or incorrectly typed reading '${sample.id}'`);
    return false;
  }
  const previous = capabilityStore.samples[sample.id];
  return !previous || sample.sequence > previous.sequence;
};

const updateSamples = (samples: ReadingSample[]): void => {
  const accepted: ReadingSample[] = [];
  batch(() => {
    for (const sample of samples) {
      if (acceptSample(sample)) {
        setCapabilityStore('samples', sample.id, reconcile(sample));
        setCapabilityStore('receivedAt', sample.id, performance.now());
        accepted.push(sample);
      }
    }
    projectBuiltinSamples(accepted);
  });
};

export const receiveCapabilitySamples = (payload: unknown): void => {
  if (!capabilityStore.connected) {
    return;
  }
  const parsed = capabilitySamplesSchema.safeParse(payload);
  if (!parsed.success) {
    logWarn('Ignored invalid capability samples', parsed.error.message);
    return;
  }
  updateSamples(parsed.data.samples);
};

export const receiveCapabilityCatalog = (payload: unknown): void => {
  const parsed = capabilityCatalogSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`Invalid ROV capability catalogue: ${parsed.error.message}`);
  }
  batch(() => {
    setCapabilityStore('catalog', reconcile(parsed.data));
    const readings = new Map(parsed.data.readings.map((reading) => [reading.id, reading]));
    const retained = Object.fromEntries(
      Object.entries(capabilityStore.samples).filter(([id, sample]) => {
        const reading = readings.get(id);
        return reading ? matchesType(reading, sample) : false;
      }),
    );
    setCapabilityStore('samples', reconcile(retained));
    const received = Object.entries(capabilityStore.receivedAt).filter(([id]) => id in retained);
    setCapabilityStore('receivedAt', reconcile(Object.fromEntries(received)));
    updateSamples(parsed.data.samples ?? []);
    setCapabilityStore('connected', true);
    setCapabilityStore('error', null);
  });
};

export const resetCapabilities = (): void => {
  setCapabilityStore(
    reconcile({
      connected: false,
      error: null,
      catalog: emptyCatalog(),
      samples: {},
      receivedAt: {},
    }),
  );
};

export const setCapabilityError = (message: string): void => {
  setCapabilityStore('error', message);
};
