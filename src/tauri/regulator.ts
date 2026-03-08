import { createSignal } from 'solid-js';

import type { RegulatorSuggestions } from '@/stores/rovConfig';

import { createListener, invokeCommand } from '@/tauri/core';

const EVENT = 'regulator_suggestions_received';

const [regulatorSuggestions, setRegulatorSuggestions] = createSignal<RegulatorSuggestions | null>(
  null,
);

export { regulatorSuggestions };

export const setupRegulatorListener = () =>
  createListener<RegulatorSuggestions>(EVENT, setRegulatorSuggestions);

export const startRegulatorAutoTuning = async () => {
  await invokeCommand('start_regulator_auto_tuning');
};
