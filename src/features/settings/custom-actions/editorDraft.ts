import { createSignal, type Accessor } from 'solid-js';

import * as m from '@/paraglide/messages';

import { installCustomAction, validateCustomAction, type CustomActionValidation } from './api';

/** Validation is bound to the exact source, never to an earlier editor revision. */
type CustomActionDraft = {
  source: Accessor<string>;
  setSource: (text: string) => void;
  load: (text: string, installed: boolean, name?: string) => void;
  validation: Accessor<CustomActionValidation | null>;
  validate: () => Promise<void>;
  install: () => Promise<void>;
  dirty: Accessor<boolean>;
  name: Accessor<string>;
  discard: () => void;
};
export const createCustomActionDraft = (): CustomActionDraft => {
  const [source, setText] = createSignal('');
  const [baseline, setBaseline] = createSignal({ source: '', name: '' });
  const [name, setName] = createSignal('');
  const [validation, setValidation] = createSignal<CustomActionValidation | null>(null);
  let validatedSource: string | null = null;
  const setSource = (text: string): void => {
    setText(text);
    validatedSource = null;
    setValidation(null);
  };
  const load = (text: string, installed: boolean, scriptName = ''): void => {
    setSource(text);
    setBaseline({ source: installed ? text : '', name: scriptName });
    setName(scriptName);
  };
  const validate = (): Promise<void> => {
    const snapshot = source();
    return validateCustomAction(snapshot).then((result) => {
      if (snapshot === source()) {
        validatedSource = snapshot;
        setValidation(result);
        setName(result.manifest.name);
      }
    });
  };
  const install = (): Promise<void> => {
    const snapshot = source();
    const result = validation();
    if (validatedSource !== snapshot || !result) {
      return Promise.reject(new Error(m.custom_action_scripts_validate_first()));
    }
    return installCustomAction(snapshot).then(() => {
      setBaseline({ source: snapshot, name: result.manifest.name });
    });
  };
  return {
    source,
    setSource,
    load,
    validation,
    validate,
    install,
    dirty: (): boolean => source() !== baseline().source,
    name,
    discard: (): void => {
      load(baseline().source, true, baseline().name);
    },
  };
};

// Preserve an unfinished draft while visiting Appearance or keybindings in this app session.
export const customActionDraft = createCustomActionDraft();
export const [customActionEditorOpen, setCustomActionEditorOpen] = createSignal(false);
