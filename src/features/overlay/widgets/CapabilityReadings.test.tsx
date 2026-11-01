// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';

import { OverlayPreviewProvider } from '@/features/overlay/OverlayPreview';
import {
  receiveCapabilityCatalog,
  receiveCapabilitySamples,
  resetCapabilities,
} from '@/stores/capabilities';
import { OverlayAnchor, type OverlayWidget } from '@/stores/overlayTypes';

import { CapabilityWidget } from './CapabilityWidget';

vi.mock('@/tauri/capabilities', () => ({ invokeAction: vi.fn() }));
vi.mock('@/lib/log', () => ({ logError: vi.fn(), logWarn: vi.fn() }));
const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};
const catalog = {
  version: 1,
  customActions: [
    { id: 'water', name: 'Water', description: '', enabled: true, status: 'running' },
  ],
  readings: [],
  actions: [],
};
const widget: OverlayWidget = {
  id: 'reading',
  type: 'capability',
  column: 1,
  row: 1,
  columnSpan: 24,
  rowSpan: 6,
  anchor: OverlayAnchor.center,
  options: {},
};
afterEach(() => {
  dispose();
  host.replaceChildren();
  resetCapabilities();
});

/* oxlint-disable no-magic-numbers -- representative sensor values and grid dimensions */
it('formats units from a custom reading descriptor', () => {
  receiveCapabilityCatalog({
    ...catalog,
    readings: [
      {
        id: 'water.temperature',
        name: 'Probe',
        valueType: 'number',
        unit: '°C',
        customActionId: 'water',
      },
    ],
  });
  receiveCapabilitySamples({
    version: 1,
    samples: [{ id: 'water.temperature', value: 57.375, sequence: 1, timestamp: Date.now() }],
  });
  dispose = render(
    () => (
      <CapabilityWidget
        widget={{
          ...widget,
          options: { sourceId: 'water.temperature', label: 'Probe', display: 'text' },
        }}
      />
    ),
    host,
  );
  expect(host.textContent).toBe('Probe57.4°C');
});

it('renders numbered values for any custom array and keeps null unavailable in previews', () => {
  receiveCapabilityCatalog({
    ...catalog,
    readings: [
      {
        id: 'water.channels',
        name: 'Channels',
        valueType: 'numberArray',
        unit: 'V',
        customActionId: 'water',
      },
    ],
  });
  const arrayWidget: OverlayWidget = {
    ...widget,
    options: { sourceId: 'water.channels', label: 'Channels', display: 'array' },
  };
  receiveCapabilitySamples({
    version: 1,
    samples: [
      {
        id: 'water.channels',
        value: [12.43, 12.47, 12.4, 12.5],
        sequence: 1,
        timestamp: Date.now(),
      },
    ],
  });
  dispose = render(
    () => (
      <OverlayPreviewProvider>
        <CapabilityWidget widget={arrayWidget} />
      </OverlayPreviewProvider>
    ),
    host,
  );
  expect(host.querySelectorAll('.overlay-array-cell')).toHaveLength(4);
  expect(host.querySelector('.overlay-unit')).toHaveProperty('textContent', 'V');
  expect(host.textContent).toContain('12.4');
  receiveCapabilitySamples({
    version: 1,
    samples: [{ id: 'water.channels', value: null, sequence: 2, timestamp: Date.now() }],
  });
  expect(host.querySelectorAll('.overlay-array-cell')).toHaveLength(0);
  expect(host.textContent).toContain('Unavailable');
});
