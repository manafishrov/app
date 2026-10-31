import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listen: vi.fn(),
  createListener: vi.fn(),
  invokeCommand: vi.fn(),
  createToast: vi.fn(),
  haptic: vi.fn(),
}));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@manafishrov/ui/toaster', () => ({ toast: { create: mocks.createToast } }));
vi.mock('@/stores/config', () => ({ configStore: {} }));
vi.mock('@/stores/connectionStatus', () => ({ connectionStatusStore: { isConnected: true } }));
vi.mock('@/tauri/gamepad', () => ({ playConfirmHaptic: mocks.haptic }));
vi.mock('@/lib/log', () => ({ logError: vi.fn() }));
vi.mock('@/tauri/core', () => ({
  createListener: mocks.createListener,
  invokeCommand: mocks.invokeCommand,
}));

import { defaultRovConfig, type RovConfig } from '@/stores/rovConfig';
import { setRovConfig, setupRovConfigListener } from '@/tauri/rovConfig';
import { setupToastListener } from '@/tauri/toast';

type ConfigResponse = { mutationId: string; config: RovConfig; error?: string };
type ToastEvent = {
  payload: { variant: string; content: { messageKey: string } };
};
let receiveConfig: (response: ConfigResponse) => void = () => 0;
let receiveToast: (event: ToastEvent) => void = () => 0;
let mutationId = '';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createListener.mockImplementation((_event: string, listener: typeof receiveConfig) => {
    receiveConfig = listener;
    return Promise.resolve(vi.fn());
  });
  mocks.listen.mockImplementation((_event: string, listener: typeof receiveToast) => {
    receiveToast = listener;
    return Promise.resolve(vi.fn());
  });
  mocks.invokeCommand.mockImplementation((_command: string, args: { mutationId: string }) => {
    ({ mutationId } = args);
    return Promise.resolve();
  });
  return Promise.all([setupRovConfigListener(), setupToastListener()]);
});

it('leaves success and its single haptic to the server toast, not config delivery', () => {
  const update = setRovConfig({ regulator: defaultRovConfig.regulator });
  return Promise.resolve()
    .then(() => {
      expect(mocks.createToast).not.toHaveBeenCalled();
      expect(mocks.haptic).not.toHaveBeenCalled();
      const response = { mutationId, config: defaultRovConfig };
      receiveConfig(response);
      receiveConfig(response);
      return update;
    })
    .then(() => {
      expect(mocks.createToast).not.toHaveBeenCalled();
      expect(mocks.haptic).not.toHaveBeenCalled();
      receiveToast({
        payload: {
          variant: 'success',
          content: { messageKey: 'toasts_rov_config_set_successfully' },
        },
      });
      expect(mocks.createToast).toHaveBeenCalledOnce();
      expect(mocks.haptic).toHaveBeenCalledOnce();
    });
});

it('does not toast or play a success haptic for an apply rejection', () => {
  const update = setRovConfig({ regulator: defaultRovConfig.regulator });
  const rejected = expect(update).rejects.toThrow('Pico rejected apply');
  return Promise.resolve()
    .then(() => {
      receiveConfig({ mutationId, config: defaultRovConfig, error: 'Pico rejected apply' });
      return rejected;
    })
    .then(() => {
      expect(mocks.createToast).not.toHaveBeenCalled();
      expect(mocks.haptic).not.toHaveBeenCalled();
      expect(mocks.invokeCommand).toHaveBeenCalledTimes(1);
    });
});
