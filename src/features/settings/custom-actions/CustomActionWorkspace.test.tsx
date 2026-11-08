// @vitest-environment happy-dom
import type { JSXElement } from 'solid-js';

import { render } from 'solid-js/web';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { receiveCapabilityCatalog, resetCapabilities } from '@/stores/capabilities';

import { CustomActionWorkspace } from './CustomActionWorkspace';
import {
  customActionDraft,
  customActionEditorOpen,
  setCustomActionEditorOpen,
} from './editorDraft';

const api = vi.hoisted(() => ({
  validate: vi.fn(),
  install: vi.fn(),
  read: vi.fn(),
  request: vi.fn(),
  import: vi.fn(),
}));
vi.mock('./api', () => ({
  validateCustomAction: api.validate,
  installCustomAction: api.install,
  readCustomAction: api.read,
}));
vi.mock('@/tauri/capabilities', () => ({
  requestCapability: api.request,
  importCustomActionSource: api.import,
  invokeAction: vi.fn(),
}));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('./PythonEditor', () => ({
  PythonEditor: (props: { source: string; onChange: (text: string) => void }): JSXElement => (
    <textarea
      aria-label='Python source'
      value={props.source}
      onInput={(event) => {
        props.onChange(event.currentTarget.value);
      }}
    />
  ),
}));
const host = document.createElement('div');
let dispose = (): void => {
  host.replaceChildren();
};
const click = (name: string): void => {
  const button = [...document.querySelectorAll('button')].find(
    (element) => element.getAttribute('aria-label') === name || element.textContent === name,
  );
  expect(button, name).toBeDefined();
  if (button) {
    button.click();
  }
};
beforeEach(() => {
  document.body.append(host);
  customActionDraft.load('', true);
  setCustomActionEditorOpen(false);
  receiveCapabilityCatalog({
    version: 1,
    customActions: [
      {
        id: 'probe',
        name: 'Probe',
        description: 'A custom probe',
        enabled: true,
        status: 'running',
      },
    ],
    readings: [],
    actions: [],
  });
  api.read.mockResolvedValue('# original');
  api.validate.mockResolvedValue({
    manifest: { id: 'probe', name: 'Probe' },
    readings: [],
    actions: [],
    warnings: [],
  });
  api.install.mockResolvedValue({ id: 'probe' });
});
afterEach(() => {
  dispose();
  host.replaceChildren();
  host.remove();
  customActionDraft.load('', true);
  setCustomActionEditorOpen(false);
  resetCapabilities();
  vi.resetAllMocks();
});

it('opens a dedicated named editor and protects unsaved edits on Back', () => {
  dispose = render(() => <CustomActionWorkspace />, host);
  expect(host.textContent).toContain('Running');
  expect(host.querySelector('details')).toBeNull();
  click('Edit script');
  return vi
    .waitFor(() => {
      expect(host.querySelector('[data-custom-action-editor]')).not.toBeNull();
    })
    .then(() => {
      expect(host.textContent).not.toContain('Installed on this ROV');
      expect(host.textContent).not.toContain('Python analysis ready');
      expect(host.querySelector('h1')).toHaveProperty('textContent', 'Probe');
      customActionDraft.setSource('# changed');
      click('Back to custom actions');
      expect(customActionEditorOpen()).toBe(true);
      expect(customActionDraft.source()).toBe('# changed');
      click('Cancel');
      expect(customActionDraft.source()).toBe('# changed');
    })
    .then(() => {
      click('Back to custom actions');
      const dialog = document.querySelector('[role="alertdialog"]');
      const buttons = dialog ? [...dialog.querySelectorAll('button')] : [];
      const discard = buttons.find((button) => button.textContent === 'Discard');
      expect(discard).toBeDefined();
      if (discard) {
        discard.click();
      }
      expect(customActionEditorOpen()).toBe(false);
      expect(customActionDraft.source()).toBe('# original');
    });
});

it('validates the edited source before saving and preserves a draft across remounts', () => {
  dispose = render(() => <CustomActionWorkspace />, host);
  click('New script');
  expect(customActionDraft.source()).toContain('script = Script(');
  customActionDraft.setSource('# custom source');
  dispose();
  dispose = render(() => <CustomActionWorkspace />, host);
  expect(host.querySelector('[data-custom-action-editor]')).not.toBeNull();
  expect(customActionDraft.source()).toBe('# custom source');
  click('Save');
  return vi.waitFor(() => {
    expect(api.validate).toHaveBeenCalledWith('# custom source');
    expect(api.install).toHaveBeenCalledWith('# custom source');
    expect(customActionDraft.dirty()).toBe(false);
  });
});
