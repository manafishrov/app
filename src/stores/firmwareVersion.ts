import { createSignal } from 'solid-js';

const [firmwareVersionStore, setFirmwareVersionStore] = createSignal<string | null>(null);

export { firmwareVersionStore, setFirmwareVersionStore };
