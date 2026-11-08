import { isMobile } from '@/lib/platform';
import * as m from '@/paraglide/messages';
import { THRUSTER_PINS } from '@/tauri/constants';

type ServerToast = {
  identifier?: string;
  content: { messageKey: string };
};

type ToastArgs = Record<string, string | number | boolean>;

const terminalKeys = new Set([
  'toasts_thruster_test_completed',
  'toasts_thruster_test_cancelled',
  'toasts_thruster_test_unavailable',
]);
const listeners = new Set<() => void>();

// Only received firmware toasts end a test, never the toaster's local timeout.
export const receiveThrusterTestToast = (payload: ServerToast): void => {
  if (payload.identifier === 'thruster-test' && terminalKeys.has(payload.content.messageKey)) {
    for (const listener of listeners) {
      listener();
    }
  }
};

export const subscribeThrusterTestEnd = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
};

// Firmware names the tested output by slot; calibration rows show its Pico pin.
export const titleArgs = ({
  messageKey,
  messageArgs = {},
}: {
  messageKey: string;
  messageArgs?: ToastArgs;
}): ToastArgs =>
  messageKey === 'toasts_thruster_test_title'
    ? { pin: `GP${THRUSTER_PINS[Number(messageArgs['thruster'])] ?? '?'}` }
    : messageArgs;

// Phones have no Escape key; the toast's Cancel button stops the test there.
export const description = (countdown?: string): string =>
  [countdown, ...(isMobile ? [] : [m.toasts_thruster_test_cancel_hint()])]
    .filter((part) => typeof part === 'string' && part.length > 0)
    .join(' ');
