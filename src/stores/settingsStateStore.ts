import { Store } from '@tanstack/react-store';

import type { Regulator } from '@/stores/droneConfigStore';

type SettingsState = {
  regulatorSuggestion?: Regulator;
  thrusterTesting: boolean;
};

const settingsStateStore = new Store<SettingsState>({
  thrusterTesting: false,
});

export { settingsStateStore, type SettingsState };
