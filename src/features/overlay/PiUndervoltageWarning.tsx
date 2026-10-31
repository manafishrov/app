import { toast } from '@manafishrov/ui/toaster';
import { createEffect, type Component } from 'solid-js';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

import { createPiUndervoltageWarningGate } from './piUndervoltageWarningGate';

const usePiUndervoltageWarning = (): void => {
  const shouldShowWarning = createPiUndervoltageWarningGate();

  createEffect(() => {
    if (!shouldShowWarning(connectionStatusStore.isConnected, rovStatusStore.piUndervoltage)) {
      return;
    }
    toast.create({
      title: m.toasts_pi_undervoltage_title(),
      description: m.toasts_pi_undervoltage_description(),
      type: 'error',
    });
  });
};

const PiUndervoltageWarning: Component = () => {
  usePiUndervoltageWarning();
  return null;
};

export { PiUndervoltageWarning, usePiUndervoltageWarning };
