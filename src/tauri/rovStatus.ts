import { setRovStatusStore, type RovStatus } from '@/stores/rovStatus';
import { createListener, type CleanupFn } from '@/tauri/core';

const EVENT = 'rov_status_update';

export const setupRovStatusListener = (): Promise<CleanupFn> =>
  createListener<RovStatus>(EVENT, setRovStatusStore, { warnOnly: true });
