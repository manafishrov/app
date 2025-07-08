import { Store } from '@tanstack/react-store';

import type { Regulator } from '@/stores/droneConfigStore';

type SettingsState = {
  regulatorSuggestions?: Regulator;
};

const settingsStateStore = new Store<SettingsState>({});

export { settingsStateStore, type SettingsState };
