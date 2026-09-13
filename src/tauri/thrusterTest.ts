type ServerToast = {
  identifier?: string;
  content: { messageKey: string };
};

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
