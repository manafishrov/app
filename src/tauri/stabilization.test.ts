import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invokeAction: vi.fn(),
  status: { autoStabilization: false, depthHold: false },
}));

vi.mock('@/stores/rovStatus', () => ({
  rovStatusStore: mocks.status,
  setAutoStabilizationOptimistic: (value: boolean): void => {
    mocks.status.autoStabilization = value;
  },
  setDepthHoldOptimistic: (value: boolean): void => {
    mocks.status.depthHold = value;
  },
}));
vi.mock('@/tauri/capabilities', () => ({ invokeAction: mocks.invokeAction }));

import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

describe('stabilization state commands', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.status.autoStabilization = false;
    mocks.status.depthHold = false;
    mocks.invokeAction.mockImplementation((): Promise<void> => Promise.resolve());
  });

  it('sends the desired auto-stabilization state explicitly', () =>
    toggleAutoStabilization().then(() => {
      expect(mocks.status.autoStabilization).toBe(true);
      expect(mocks.invokeAction).toHaveBeenCalledWith('rov.autoStabilization.set', 'press', true);
    }));

  it('sends the desired depth-hold state explicitly', () => {
    mocks.status.depthHold = true;

    return toggleDepthHold().then(() => {
      expect(mocks.status.depthHold).toBe(false);
      expect(mocks.invokeAction).toHaveBeenCalledWith('rov.depthHold.set', 'press', false);
    });
  });

  it('rolls back and rejects when delivery fails', () => {
    mocks.invokeAction.mockRejectedValue(new Error('delivery failed'));

    return expect(toggleAutoStabilization())
      .rejects.toThrow('delivery failed')
      .then(() => {
        expect(mocks.status.autoStabilization).toBe(false);
      });
  });
});
