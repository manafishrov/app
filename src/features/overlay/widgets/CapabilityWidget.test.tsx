// @vitest-environment happy-dom
import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { OverlayPreviewProvider } from '@/features/overlay/OverlayPreview';
import {
  receiveCapabilityCatalog,
  receiveCapabilitySamples,
  resetCapabilities,
} from '@/stores/capabilities';
import { OverlayAnchor, type OverlayWidget } from '@/stores/overlayTypes';

import { CapabilityWidget } from './CapabilityWidget';

const transport = vi.hoisted(() => ({ invoke: vi.fn(() => Promise.resolve()) }));
vi.mock('@/tauri/capabilities', () => ({ invokeAction: transport.invoke }));
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
  readings: [{ id: 'water.wet', name: 'Water', valueType: 'boolean', customActionId: 'water' }],
  actions: [
    {
      id: 'water.test',
      name: 'Test',
      inputType: 'none',
      modes: ['once', 'hold'],
      mode: 'hold',
      intervalMs: 250,
      customActionId: 'water',
    },
  ],
};
const widget: OverlayWidget = {
  id: 'water',
  type: 'capability',
  column: 1,
  row: 1,
  columnSpan: 6,
  rowSpan: 2,
  anchor: OverlayAnchor.center,
  options: { sourceId: 'water.wet', sourceKind: 'reading', display: 'ping', label: 'Water' },
};
const actionWidget: OverlayWidget = {
  ...widget,
  options: { sourceId: 'water.test', sourceKind: 'action', label: 'Test' },
};
const publish = (sequence: number): void => {
  receiveCapabilitySamples({
    version: 1,
    samples: [{ id: 'water.wet', value: true, sequence, timestamp: Date.now() }],
  });
};
const opacity = (): string | null => {
  const light = host.querySelector('.overlay-capability-light');
  return light ? light.getAttribute('style') : null;
};
const stateAttribute = (): string | null => {
  const node = host.querySelector<HTMLElement>('.overlay-capability');
  return node ? (node.dataset['state'] ?? null) : null;
};
const lightAttribute = (): string | null => {
  const node = host.querySelector<HTMLElement>('.overlay-capability-light');
  return node ? (node.dataset['active'] ?? null) : null;
};
beforeEach(() => {
  document.body.append(host);
  receiveCapabilityCatalog(catalog);
});
afterEach(() => {
  dispose();
  host.replaceChildren();
  host.remove();
  resetCapabilities();
  vi.clearAllMocks();
  vi.useRealTimers();
});

/* oxlint-disable no-magic-numbers -- input timing and fixture grid dimensions */
it('restarts a ping for repeated true values and lets it expire', () => {
  vi.useFakeTimers();
  dispose = render(() => <CapabilityWidget widget={widget} />, host);
  publish(1);
  expect(opacity()).toContain('opacity: 1');
  vi.advanceTimersByTime(400);
  publish(2);
  vi.advanceTimersByTime(400);
  expect(opacity()).toContain('opacity: 1');
  vi.advanceTimersByTime(101);
  expect(opacity()).toContain('opacity: 0.25');
});
it('retains a labelled placeholder when a source disappears', () => {
  dispose = render(() => <CapabilityWidget widget={widget} />, host);
  expect(host.textContent).toContain('No data yet');
  resetCapabilities();
  expect(host.textContent).toContain('Unavailable');
  expect(host.textContent).toContain('Water');
});
it('releases a keyboard-held widget action exactly once', () => {
  dispose = render(() => <CapabilityWidget widget={actionWidget} />, host);
  const button = host.querySelector('button');
  if (!button) {
    throw new Error('Missing action button');
  }
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true }));
  expect(transport.invoke).toHaveBeenCalledExactlyOnceWith('water.test', 'press');
  button.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
  expect(transport.invoke).toHaveBeenLastCalledWith('water.test', 'release');
  expect(transport.invoke).toHaveBeenCalledTimes(2);
});
it('never invokes an action from the layout preview', () => {
  dispose = render(
    () => (
      <OverlayPreviewProvider>
        <CapabilityWidget widget={actionWidget} />
      </OverlayPreviewProvider>
    ),
    host,
  );
  const button = host.querySelector('button');
  if (!button) {
    throw new Error('Missing preview button');
  }
  button.click();
  expect(transport.invoke).not.toHaveBeenCalled();
});

it('shows explicit unavailability for a null sensor sample', () => {
  dispose = render(() => <CapabilityWidget widget={widget} />, host);
  receiveCapabilitySamples({
    version: 1,
    samples: [{ id: 'water.wet', value: null, sequence: 1, timestamp: Date.now() }],
  });
  expect(host.textContent).toContain('Unavailable');
  expect(host.querySelector('.overlay-capability-light')).toBeNull();
});

it('disables actions and releases local activation when a custom action stops', () => {
  dispose = render(() => <CapabilityWidget widget={actionWidget} />, host);
  const button = host.querySelector('button');
  if (!button) {
    throw new Error('Missing action button');
  }
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  receiveCapabilityCatalog({
    ...catalog,
    customActions: [
      { id: 'water', name: 'Water', description: '', enabled: false, status: 'stopped' },
    ],
  });
  expect(button.disabled).toBe(true);
  expect(transport.invoke).toHaveBeenLastCalledWith('water.test', 'release');
});

it('releases a held widget when the window loses focus', () => {
  dispose = render(() => <CapabilityWidget widget={actionWidget} />, host);
  const button = host.querySelector('button');
  if (!button) {
    throw new Error('Missing action button');
  }
  button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  globalThis.dispatchEvent(new Event('blur'));
  expect(transport.invoke).toHaveBeenLastCalledWith('water.test', 'release');
});

it('shows a manual reading age without confusing dry with no data or stale', () => {
  vi.useFakeTimers();
  dispose = render(
    () => (
      <CapabilityWidget widget={{ ...widget, options: { ...widget.options, display: 'status' } }} />
    ),
    host,
  );
  expect(host.textContent).toContain('No data yet');
  receiveCapabilitySamples({
    version: 1,
    samples: [
      { id: 'water.wet', value: false, sequence: 1, timestamp: 9_999_999_999_999, ageMs: 7000 },
    ],
  });
  expect(host.textContent).toContain('7s ago');
  expect(stateAttribute()).toBe('ready');
  vi.advanceTimersByTime(60_000);
  expect(host.textContent).toContain('1m ago');
  expect(stateAttribute()).toBe('ready');
  expect(lightAttribute()).toBe('false');
});

it('expires continuous readings at their deadline and recovers on an identical fresh value', () => {
  vi.useFakeTimers();
  receiveCapabilityCatalog({
    ...catalog,
    readings: [{ ...catalog.readings[0], staleAfterMs: 250 }],
  });
  dispose = render(() => <CapabilityWidget widget={widget} />, host);
  publish(1);
  vi.advanceTimersByTime(250);
  expect(host.textContent).toContain('Stale');
  publish(2);
  expect(stateAttribute()).toBe('ready');
  vi.advanceTimersByTime(250);
  expect(host.textContent).toContain('Stale');
});

it('distinguishes a failed script from an inactive sensor light', () => {
  dispose = render(() => <CapabilityWidget widget={widget} />, host);
  publish(1);
  receiveCapabilityCatalog({
    ...catalog,
    customActions: [{ ...catalog.customActions[0], status: 'error', error: 'GPIO read failed' }],
  });
  expect(host.textContent).toContain('Reading failed');
  expect(host.querySelector('.overlay-capability-light')).toBeNull();
});

it('disposes freshness timers when the widget is removed', () => {
  vi.useFakeTimers();
  receiveCapabilityCatalog({
    ...catalog,
    readings: [{ ...catalog.readings[0], staleAfterMs: 5000 }],
  });
  dispose = render(() => <CapabilityWidget widget={widget} />, host);
  publish(1);
  dispose();
  expect(vi.getTimerCount()).toBe(0);
});
