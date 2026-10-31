import { beforeEach, expect, it, vi } from 'vitest';

import { MAX_SOURCE_BYTES, installCustomAction, validateCustomAction } from './api';

const request = vi.hoisted(() => vi.fn());
vi.mock('@/tauri/capabilities', () => ({ requestCapability: request }));
beforeEach(() => vi.clearAllMocks());

it('rejects oversized UTF-8 source before sending a request which could disconnect the ROV', () => {
  const source = '海'.repeat(MAX_SOURCE_BYTES);
  return expect(validateCustomAction(source))
    .rejects.toThrow('256 KiB')
    .then(() => {
      expect(request).not.toHaveBeenCalled();
      return expect(installCustomAction(source)).rejects.toThrow('256 KiB');
    })
    .then(() => {
      expect(request).not.toHaveBeenCalled();
    });
});

it('preserves exact source content when installing a valid-sized script', () => {
  request.mockResolvedValue(null);
  const source = '# λ\r\nMANIFEST = {}\r\n';
  return installCustomAction(source).then(() => {
    expect(request).toHaveBeenCalledWith('customAction.install', { source });
  });
});
