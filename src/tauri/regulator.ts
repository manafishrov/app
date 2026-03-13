import { createSignal } from 'solid-js';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'regulator_suggestions_received';

const [regulatorSuggestions, setRegulatorSuggestions] = createSignal<RegulatorSuggestions>();

export { regulatorSuggestions };

export const setupRegulatorListener = (): Promise<() => void> =>
  createListener<RegulatorSuggestions>(EVENT, setRegulatorSuggestions);

export const startRegulatorAutoTuning = (): Promise<void> =>
  invokeCommand('start_regulator_auto_tuning');
