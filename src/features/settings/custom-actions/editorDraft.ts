import { createSignal, type Accessor } from 'solid-js';

import * as m from '@/paraglide/messages';

import { installCustomAction, validateCustomAction, type CustomActionValidation } from './api';

/** Validation is bound to the exact source, never to an earlier editor revision. */
type CustomActionDraft = {
  source: Accessor<string>;
  setSource: (text: string) => void;
  load: (text: string, installed: boolean) => void;
  validation: Accessor<CustomActionValidation | null>;
  validate: () => Promise<void>;
  install: () => Promise<void>;
  dirty: Accessor<boolean>;
};
export const createCustomActionDraft = (): CustomActionDraft => {
  const [source, setText] = createSignal('');
  const [baseline, setBaseline] = createSignal('');
  const [validation, setValidation] = createSignal<CustomActionValidation | null>(null);
  let validatedSource: string | null = null;
  const setSource = (text: string): void => {
    setText(text);
    validatedSource = null;
    setValidation(null);
  };
  const load = (text: string, installed: boolean): void => {
    setSource(text);
    setBaseline(installed ? text : '');
  };
  const validate = (): Promise<void> => {
    const snapshot = source();
    return validateCustomAction(snapshot).then((result) => {
      if (snapshot === source()) {
        validatedSource = snapshot;
        setValidation(result);
      }
    });
  };
  const install = (): Promise<void> => {
    const snapshot = source();
    if (validatedSource !== snapshot || !validation()) {
      return Promise.reject(new Error(m.custom_action_scripts_validate_first()));
    }
    return installCustomAction(snapshot).then(() => {
      setBaseline(snapshot);
    });
  };
  return {
    source,
    setSource,
    load,
    validation,
    validate,
    install,
    dirty: (): boolean => source() !== baseline(),
  };
};

// Preserve an unfinished draft while visiting Appearance or keybindings in this app session.
export const customActionDraft = createCustomActionDraft();
