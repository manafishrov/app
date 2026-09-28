/* oxlint-disable no-magic-numbers -- explicit stream sequence and reading fixtures */
import { beforeEach, expect, it, vi } from 'vitest';

import type { ReadingSample } from '@/stores/capabilityTypes';

import {
  capabilityStore,
  receiveCapabilityCatalog,
  receiveCapabilitySamples,
  resetCapabilities,
} from '@/stores/capabilities';
import firmwareCatalog from '@/stores/fixtures/capabilityCatalog.json';
import { rovStatusStore } from '@/stores/rovStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

vi.mock('@/lib/log', () => ({ logWarn: vi.fn() }));
const reading = {
  id: 'water.wet',
  name: 'Water detected',
  valueType: 'boolean',
  extensionId: 'water',
};
const catalog = {
  version: 1,
  readings: [reading, { id: 'rov.depth', name: 'Depth', valueType: 'number', extensionId: null }],
  actions: [],
  extensions: [],
};
const sample = (sequence: number, value: boolean): ReadingSample => ({
  id: 'water.wet',
  sequence,
  value,
  timestamp: sequence,
});
beforeEach(resetCapabilities);

it('projects built-in and extension readings from the same snapshot and update stream', () => {
  receiveCapabilityCatalog({
    ...catalog,
    samples: [sample(1, false), { id: 'rov.depth', value: 12, sequence: 1, timestamp: 1 }],
  });
  expect(rovTelemetryStore.depth).toBe(12);
  expect(capabilityStore.samples['water.wet'] && capabilityStore.samples['water.wet'].value).toBe(
    false,
  );
  receiveCapabilitySamples({
    version: 1,
    samples: [sample(2, true), { id: 'rov.depth', value: 13, sequence: 2, timestamp: 2 }],
  });
  expect(rovTelemetryStore.depth).toBe(13);
  expect(capabilityStore.samples['water.wet'] && capabilityStore.samples['water.wet'].value).toBe(
    true,
  );
});

it('preserves repeated identical events while dropping duplicates and older samples', () => {
  receiveCapabilityCatalog(catalog);
  receiveCapabilitySamples({ version: 1, samples: [sample(1, true), sample(2, true)] });
  expect(
    capabilityStore.samples['water.wet'] && capabilityStore.samples['water.wet'].sequence,
  ).toBe(2);
  receiveCapabilitySamples({ version: 1, samples: [sample(1, false), sample(2, false)] });
  expect(capabilityStore.samples['water.wet'] && capabilityStore.samples['water.wet'].value).toBe(
    true,
  );
});

it('rejects mismatched values and unsupported protocol versions', () => {
  receiveCapabilityCatalog(catalog);
  receiveCapabilitySamples({ version: 1, samples: [{ ...sample(1, true), value: 'yes' }] });
  expect(capabilityStore.samples['water.wet']).toBeUndefined();
  expect(() => {
    receiveCapabilityCatalog({ ...catalog, version: 2 });
  }).toThrow('Invalid ROV capability catalogue');
});

it('clears samples and capabilities on disconnect and accepts a restarted sequence', () => {
  receiveCapabilityCatalog({ ...catalog, samples: [sample(2, true)] });
  resetCapabilities();
  expect(capabilityStore.connected).toBe(false);
  expect(capabilityStore.samples).toEqual({});
  receiveCapabilityCatalog({ ...catalog, samples: [sample(1, false)] });
  expect(capabilityStore.samples['water.wet'] && capabilityStore.samples['water.wet'].value).toBe(
    false,
  );
});

it('removes samples when an extension is removed', () => {
  receiveCapabilityCatalog({ ...catalog, samples: [sample(1, true)] });
  receiveCapabilityCatalog({ ...catalog, readings: [] });
  expect(capabilityStore.samples).toEqual({});
});

it('accepts unavailable readings without confusing them with false or zero', () => {
  receiveCapabilityCatalog({ ...catalog, samples: [{ ...sample(1, true), value: null }] });
  expect(
    capabilityStore.samples['water.wet'] && capabilityStore.samples['water.wet'].value,
  ).toBeNull();
});

it('projects every high-frequency built-in sample without delaying attitude instruments', () => {
  receiveCapabilityCatalog({
    ...catalog,
    readings: [{ id: 'rov.pitch', name: 'Pitch', valueType: 'number', extensionId: null }],
  });
  for (let frame = 1; frame <= 60; frame += 1) {
    receiveCapabilitySamples({
      version: 1,
      samples: [{ id: 'rov.pitch', value: frame, sequence: frame, timestamp: frame }],
    });
    expect(rovTelemetryStore.pitch).toBe(frame);
  }
});

it('accepts the real firmware catalogue and projects its structured builtin samples', () => {
  receiveCapabilityCatalog(firmwareCatalog);
  expect(capabilityStore.catalog.extensions).toHaveLength(3);
  expect(capabilityStore.catalog.actions.some((action) => action.id === 'rov.direction')).toBe(
    true,
  );
  for (const readingSample of firmwareCatalog.samples) {
    const received = capabilityStore.samples[readingSample.id];
    expect(received && received.value).toEqual(readingSample.value);
  }
  const health = firmwareCatalog.samples.find((readingSample) => readingSample.id === 'rov.health');
  expect(rovStatusStore.health).toEqual(health && health.value);
});

it('drops the old sample if an updated extension changes a reading type', () => {
  receiveCapabilityCatalog({ ...catalog, samples: [sample(1, true)] });
  receiveCapabilityCatalog({ ...catalog, readings: [{ ...reading, valueType: 'number' }] });
  expect(capabilityStore.samples['water.wet']).toBeUndefined();
});
