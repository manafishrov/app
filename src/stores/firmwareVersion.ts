import { Store } from '@tanstack/react-store';

const firmwareVersionStore = new Store<string | null>(null);

export { firmwareVersionStore };
