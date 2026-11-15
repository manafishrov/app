import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  createToast: vi.fn(),
}));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: mocks.createToast } }));
vi.mock('@/stores/config', () => ({ configStore: {} }));
vi.mock('@/tauri/gamepad', () => ({ playConfirmHaptic: vi.fn() }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

import { setupToastListener } from '@/tauri/toast';

type ToastEvent = { payload: Record<string, unknown> };
const [undef] = [] as undefined[];
let receiveToast: (event: ToastEvent) => void = () => 0;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listen.mockImplementation((_event: string, listener: typeof receiveToast) => {
    receiveToast = listener;
    return Promise.resolve(vi.fn());
  });
});

it('clears the progress description and action when a toast finishes', () =>
  setupToastListener().then(() => {
    receiveToast({
      payload: {
        identifier: 'flash-esc-firmware',
        variant: 'loading',
        content: {
          messageKey: 'toasts_esc_flash_in_progress',
          messageArgs: { percent: 50 },
          description: 'Writing and verifying ESC 4 of 8.',
        },
        action: { messageType: 'cancelThrusterTest' },
      },
    });
    receiveToast({
      payload: {
        identifier: 'flash-esc-firmware',
        variant: 'success',
        content: { messageKey: 'toasts_esc_flash_success' },
      },
    });

    const calls: unknown[][] = mocks.createToast.mock.calls;
    const [, [finished] = []] = calls;
    /* The toaster merges updates into the toast with the same id, so the keys
       must be present and undefined to remove what the progress toast showed. */
    expect(finished).toHaveProperty('description', undef);
    expect(finished).toHaveProperty('action', undef);
    expect(finished).toMatchObject({ id: 'flash-esc-firmware', type: 'success' });
  }));
