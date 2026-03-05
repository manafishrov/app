import type { RegulatorSuggestions } from '@/stores/rovConfig';

import { createListener } from '@/tauri/core';

const EVENT = 'regulator_suggestions_received';

const [regulatorSuggestions, setRegulatorSuggestions] = createSignal<RegulatorSuggestions | null>(
  null,
);

export { regulatorSuggestions };

export const setupRegulatorListener = () => {
  return createListener<RegulatorSuggestions>(EVENT, setRegulatorSuggestions);
};
