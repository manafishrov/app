import { setRovStatusStore, type RovStatus } from '@/stores/rovStatus';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_status_update';

export function setupRovStatusListener() {
  return createListener<RovStatus>(EVENT, setRovStatusStore, { warnOnly: true });
}
