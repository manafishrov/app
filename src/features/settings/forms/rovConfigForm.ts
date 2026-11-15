import { evaluate } from '@tanstack/solid-form';

type RovConfigForm<TValues> = {
  state: { values: TValues };
  reset: (values: TValues) => void;
};

type RovConfigFormSource<TValues> = {
  save: (value: TValues) => Promise<void>;
  readStored: () => TValues;
};

/**
 * Saves a ROV config form, then shows the config the ROV kept, including firmware clamping
 * and rejected changes. Resetting also untouches the form, so later config pushes reach it.
 * Edits made while the save was in flight are kept for their own save to settle.
 */
export const saveRovConfigForm = <TValues>(
  form: RovConfigForm<TValues>,
  value: TValues,
  source: RovConfigFormSource<TValues>,
): Promise<void> =>
  source.save(value).finally(() => {
    if (evaluate(form.state.values, value)) {
      form.reset(source.readStored());
    }
  });
