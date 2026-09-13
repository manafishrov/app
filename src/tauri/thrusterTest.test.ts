import { afterEach, beforeEach, expect, it, vi } from 'vitest';

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
  toasts_thruster_test_cancel_hint: (): string => 'Press Esc in Calibration to cancel.',
  toasts_seconds_remaining: (): string => '3 seconds remaining',
  toasts_thruster_test_completed: (): string => 'Completed',
  toasts_thruster_test_cancelled: (): string => 'Cancelled',
  toasts_thruster_test_unavailable: (): string => 'Unavailable',
}));

import { subscribeThrusterTestEnd } from './thrusterTest';
import { setupToastListener } from './toast';

type ToastEvent = {
  payload: {
    identifier: string;
    variant: string;
    content: { messageKey: string; descriptionKey?: string | undefined };
  };
};
const isListener = (value: unknown): value is (event: ToastEvent) => void =>
  typeof value === 'function';

const deliverToast = (
  variant: string,
  messageKey: string,
  options: { descriptionKey?: string; identifier?: string } = {},
): void => {
  const { descriptionKey, identifier = 'thruster-test' } = options;
  const [call = []]: unknown[][] = mocks.listen.mock.calls;
  const [, listener] = call;
  if (!isListener(listener)) {
    throw new TypeError('Expected a registered toast listener');
  }
  listener({ payload: { identifier, variant, content: { messageKey, descriptionKey } } });
};

beforeEach(() => {
  vi.clearAllMocks();
});

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

it('keeps the countdown and adds a calibration-scoped Escape hint to active test toasts', () => {
  mocks.listen.mockResolvedValue(vi.fn());
  return setupToastListener().then((cleanup) => {
    deliverToast('loading', 'toasts_thruster_test_title', {
      descriptionKey: 'toasts_seconds_remaining',
    });
    expect(mocks.createToast).toHaveBeenLastCalledWith({
      id: 'thruster-test',
      type: 'loading',
      title: 'Testing',
      description: '3 seconds remaining Press Esc in Calibration to cancel.',
    });
    cleanup();
  });
});

it('shows the hint even when the active test has no countdown description', () => {
  mocks.listen.mockResolvedValue(vi.fn());
  return setupToastListener().then((cleanup) => {
    deliverToast('loading', 'toasts_thruster_test_title');
    expect(mocks.createToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        description: 'Press Esc in Calibration to cancel.',
      }),
    );
    cleanup();
  });
});

it.each([
  ['toasts_thruster_test_completed', 'thruster-test'],
  ['toasts_thruster_test_cancelled', 'thruster-test'],
  ['toasts_thruster_test_unavailable', 'thruster-test'],
  ['toasts_thruster_test_title', 'other-operation'],
])('does not add the hint to %s / %s', (messageKey, identifier) => {
  mocks.listen.mockResolvedValue(vi.fn());
  return setupToastListener().then((cleanup) => {
    deliverToast('info', messageKey, { descriptionKey: 'toasts_seconds_remaining', identifier });
    expect(mocks.createToast).toHaveBeenLastCalledWith(
      expect.objectContaining({
        description: '3 seconds remaining',
      }),
    );
    cleanup();
  });
});
