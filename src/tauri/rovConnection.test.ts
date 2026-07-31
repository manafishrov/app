import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  setConfig: vi.fn(),
  setRovConfig: vi.fn(),
}));

vi.mock('@/tauri/config', () => ({ setConfig: mocks.setConfig }));
vi.mock('@/tauri/rovConfig', () => ({ setRovConfig: mocks.setRovConfig }));

import { updateRovConnection } from '@/tauri/rovConnection';

describe('updateRovConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setRovConfig.mockImplementation(() => Promise.resolve());
    mocks.setConfig.mockImplementation(() => Promise.resolve());
  });

  test('retargets the app after sending the connection change to the ROV', () => {
    const calls: string[] = [];
    mocks.setRovConfig.mockImplementation(() => {
      calls.push('rov');
      return Promise.resolve();
    });
    mocks.setConfig.mockImplementation(() => {
      calls.push('app');
      return Promise.resolve();
    });

    return updateRovConnection({ ipAddress: '10.10.11.10', websocketPort: 9100 }).then(() => {
      expect(calls).toEqual(['rov', 'app']);
      expect(mocks.setRovConfig).toHaveBeenCalledWith({
        ipAddress: '10.10.11.10',
        websocketPort: 9100,
      });
      expect(mocks.setConfig).toHaveBeenCalledWith({
        ipAddress: '10.10.11.10',
        webSocketPort: 9100,
      });
    });
  });

  test('keeps the app on the current address if sending to the ROV fails', () => {
    mocks.setRovConfig.mockRejectedValue(new Error('send failed'));

    return expect(updateRovConnection({ ipAddress: '10.10.11.10', websocketPort: 9100 }))
      .rejects.toThrow('send failed')
      .then(() => {
        expect(mocks.setConfig).not.toHaveBeenCalled();
      });
  });
});
