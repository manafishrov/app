import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ listen: vi.fn(), createToast: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: mocks.createToast } }));
vi.mock('@/stores/config', () => ({ configStore: {} }));
vi.mock('@/tauri/gamepad', () => ({ playConfirmHaptic: vi.fn() }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('@/paraglide/messages', () => ({
  toasts_operation_timed_out: (): string => 'Timed out',
  toasts_thruster_test_title: (): string => 'Testing',
  toasts_thruster_test_completed: (): string => 'Completed',
  toasts_thruster_test_cancelled: (): string => 'Cancelled',
}));

import { subscribeThrusterTestEnd } from './thrusterTest';
import { setupToastListener } from './toast';

type ToastEvent = {
  payload: {
    identifier: string;
    variant: string;
    content: { messageKey: string };
  };
};
const isListener = (value: unknown): value is (event: ToastEvent) => void =>
  typeof value === 'function';

const deliverToast = (variant: string, messageKey: string): void => {
  const [call = []]: unknown[][] = mocks.listen.mock.calls;
  const [, listener] = call;
  if (!isListener(listener)) {
    throw new TypeError('Expected a registered toast listener');
  }
  listener({ payload: { identifier: 'thruster-test', variant, content: { messageKey } } });
};

afterEach(() => {
  vi.useRealTimers();
});

it('forwards firmware terminal toasts, but not the local loading timeout, to test subscribers', () => {
  vi.useFakeTimers();
  mocks.listen.mockResolvedValue(vi.fn());
  const ended = vi.fn();
  const unsubscribe = subscribeThrusterTestEnd(ended);
  return setupToastListener().then((cleanup) => {
    deliverToast('loading', 'toasts_thruster_test_title');
    vi.runAllTimers();
    expect(ended).not.toHaveBeenCalled();
    expect(mocks.createToast).toHaveBeenLastCalledWith({
      id: 'thruster-test',
      title: 'Timed out',
      type: 'error',
    });
    deliverToast('success', 'toasts_thruster_test_completed');
    expect(ended).toHaveBeenCalledOnce();
    unsubscribe();
    deliverToast('info', 'toasts_thruster_test_cancelled');
    expect(ended).toHaveBeenCalledOnce();
    cleanup();
  });
});
