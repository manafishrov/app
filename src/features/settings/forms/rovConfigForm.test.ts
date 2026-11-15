/* oxlint-disable no-magic-numbers -- small config values read clearer inline */
import { FormApi } from '@tanstack/solid-form';
import { expect, it } from 'vitest';

import { saveRovConfigForm } from './rovConfigForm';

type Values = { kp: number; ki: number };

it('shows the config the ROV kept and accepts later config pushes', () => {
  const form = new FormApi({ defaultValues: { kp: 1, ki: 1 } });
  form.mount();
  form.setFieldValue('kp', 500);
  const stored: Values = { kp: 100, ki: 1 };

  return saveRovConfigForm(form, form.state.values, {
    save: () => Promise.resolve(),
    readStored: () => stored,
  }).then(() => {
    expect(form.state.values).toEqual(stored);
    expect(form.state.isTouched).toBe(false);
    // Solid-form re-applies options when the config store changes; untouched forms follow it.
    form.update({ defaultValues: { kp: 7, ki: 8 } });
    expect(form.state.values).toEqual({ kp: 7, ki: 8 });
  });
});

it('reverts to the stored config when the ROV rejects the save', () => {
  const form = new FormApi({ defaultValues: { kp: 1, ki: 1 } });
  form.mount();
  form.setFieldValue('kp', 5);

  const save = saveRovConfigForm(form, form.state.values, {
    save: () => Promise.reject(new Error('rejected')),
    readStored: () => ({ kp: 1, ki: 1 }),
  });

  return expect(save)
    .rejects.toThrow('rejected')
    .then(() => {
      expect(form.state.values).toEqual({ kp: 1, ki: 1 });
    });
});

it('keeps edits made while the save was in flight', () => {
  const form = new FormApi({ defaultValues: { kp: 1, ki: 1 } });
  form.mount();
  form.setFieldValue('kp', 2);

  return saveRovConfigForm(form, form.state.values, {
    save: () => {
      form.setFieldValue('ki', 3);
      return Promise.resolve();
    },
    readStored: () => ({ kp: 2, ki: 1 }),
  }).then(() => {
    expect(form.state.values).toEqual({ kp: 2, ki: 3 });
    expect(form.state.isDirty).toBe(true);
  });
});
