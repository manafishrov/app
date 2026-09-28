import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ listen: vi.fn(), create: vi.fn() }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: mocks.create } }));
vi.mock('@/stores/config', () => ({ configStore: {} }));
vi.mock('@/tauri/gamepad', () => ({ playConfirmHaptic: vi.fn() }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));

import { setupToastListener } from './toast';

type Notification = {
  payload: {
    identifier: string;
    variant: string;
    content: { messageKey: string; message: string; description: string };
  };
};
let receive: (event: Notification) => void = () => 0;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.listen.mockImplementation((_event: string, listener: typeof receive) => {
    receive = listener;
    return Promise.resolve(vi.fn());
  });
});

it('renders SDK plain text literally through the existing toast system', () =>
  setupToastListener().then((cleanup) => {
    receive({
      payload: {
        identifier: 'custom-action:sensor:wet',
        variant: 'warn',
        content: {
          messageKey: '',
          message: 'Water detected <b>now</b>',
          description: 'Check {housing}',
        },
      },
    });
    expect(mocks.create).toHaveBeenCalledWith({
      id: 'custom-action:sensor:wet',
      type: 'warning',
      title: 'Water detected <b>now</b>',
      description: 'Check {housing}',
    });
    cleanup();
  }));
