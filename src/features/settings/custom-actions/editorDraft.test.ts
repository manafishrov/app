import { beforeEach, expect, it, vi } from 'vitest';

import type { CustomActionValidation } from './api';

import { createCustomActionDraft } from './editorDraft';

const api = vi.hoisted(() => ({ validate: vi.fn(), install: vi.fn() }));
vi.mock('./api', () => ({ validateCustomAction: api.validate, installCustomAction: api.install }));
vi.mock('@/paraglide/messages', () => ({
  custom_action_scripts_validate_first: (): string => 'Validate first',
}));
const validated: CustomActionValidation = {
  manifest: { id: 'sensor', name: 'Sensor' },
  readings: [],
  actions: [],
  warnings: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  api.validate.mockResolvedValue(validated);
  api.install.mockResolvedValue({ id: 'sensor' });
});

it('requires validation of exactly the source being installed', () => {
  const draft = createCustomActionDraft();
  draft.load('original', false);
  return draft
    .validate()
    .then(() => {
      expect(draft.validation()).toEqual(validated);
      draft.setSource('changed');
      expect(draft.validation()).toBeNull();
      return expect(draft.install()).rejects.toThrow('Validate first');
    })
    .then(() => {
      expect(api.install).not.toHaveBeenCalled();
    });
});

it('ignores validation which completes after the source was edited', () => {
  let resolve: (result: CustomActionValidation) => void = vi.fn();
  api.validate.mockImplementation(
    () =>
      new Promise<CustomActionValidation>((done) => {
        resolve = done;
      }),
  );
  const draft = createCustomActionDraft();
  draft.load('original', false);
  const pending = draft.validate();
  draft.setSource('changed');
  resolve(validated);
  return pending.then(() => {
    expect(draft.validation()).toBeNull();
    expect(draft.source()).toBe('changed');
  });
});

it('preserves source bytes and keeps failed installations dirty', () => {
  const draft = createCustomActionDraft();
  const source = '# sensor\r\n# å\r\n';
  draft.load(source, false);
  api.install.mockRejectedValue(new Error('Disconnected'));
  return draft
    .validate()
    .then(() => expect(draft.install()).rejects.toThrow('Disconnected'))
    .then(() => {
      expect(api.install).toHaveBeenCalledWith(source);
      expect(draft.dirty()).toBe(true);
      expect(draft.source()).toBe(source);
    });
});

it('marks installed source clean without erasing later edits', () => {
  const draft = createCustomActionDraft();
  draft.load('source', true);
  expect(draft.dirty()).toBe(false);
  draft.setSource('updated');
  return draft
    .validate()
    .then(draft.install)
    .then(() => {
      expect(draft.dirty()).toBe(false);
      draft.setSource('next revision');
      expect(draft.dirty()).toBe(true);
    });
});
