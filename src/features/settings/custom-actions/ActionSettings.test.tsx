// @vitest-environment happy-dom
import type { JSXElement } from 'solid-js';

import { render } from 'solid-js/web';
import { afterEach, expect, it, vi } from 'vitest';

import type { ActionDescriptor } from '@/stores/capabilityTypes';

import { ActionSettings } from './ActionSettings';

const api = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/tauri/capabilities', () => ({ requestCapability: api.request, invokeAction: vi.fn() }));
vi.mock('@/stores/capabilities', () => ({ capabilityStore: { samples: {} } }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('./OptionSelect', () => ({
  OptionSelect: (props: { value: string; onChange: (value: string) => void }): JSXElement => (
    <select
      value={props.value}
      onChange={(event) => {
        props.onChange(event.currentTarget.value);
      }}
    >
      <option value='once'>Once</option>
      <option value='hold'>Hold</option>
    </select>
  ),
}));
const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};
const action: ActionDescriptor = {
  id: 'custom.run',
  name: 'Run',
  customActionId: 'custom',
  inputType: 'none',
  modes: ['once', 'hold'],
  mode: 'once',
  intervalMs: 250,
};
const mount = (descriptor = action): void => {
  document.body.append(host);
  dispose = render(() => <ActionSettings action={descriptor} enabled />, host);
};
afterEach(() => {
  dispose();
  host.remove();
  host.replaceChildren();
  vi.resetAllMocks();
});

it('saves trigger changes immediately and reveals repeat settings', () => {
  api.request.mockResolvedValue(null);
  mount();
  expect(host.querySelector('input')).toBeNull();
  const select = host.querySelector('select');
  if (!select) {
    throw new Error('Missing trigger select');
  }
  select.value = 'hold';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return vi.waitFor(() => {
    expect(api.request).toHaveBeenCalledExactlyOnceWith('action.configure', {
      id: 'custom.run',
      mode: 'hold',
      intervalMs: 250,
    });
    expect(host.querySelector('input')).not.toBeNull();
  });
});

it('saves an edited repeat interval on blur rather than on each keystroke', () => {
  api.request.mockResolvedValue(null);
  mount({ ...action, mode: 'hold' });
  const input = host.querySelector('input');
  if (!input) {
    throw new Error('Missing repeat input');
  }
  input.focus();
  input.value = '500';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  expect(api.request).not.toHaveBeenCalled();
  return Promise.resolve().then(() => {
    input.blur();
    return vi.waitFor(() => {
      expect(api.request).toHaveBeenCalledWith('action.configure', {
        id: 'custom.run',
        mode: 'hold',
        intervalMs: 500,
      });
    });
  });
});
