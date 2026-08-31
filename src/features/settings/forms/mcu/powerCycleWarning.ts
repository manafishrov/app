import { createSignal } from 'solid-js';

const [powerCycleWarningOpen, setPowerCycleWarningOpen] = createSignal(false);

export const requestPowerCycleWarning = (): void => {
  setPowerCycleWarningOpen(true);
};

export const dismissPowerCycleWarning = (): void => {
  setPowerCycleWarningOpen(false);
};

export { powerCycleWarningOpen };
