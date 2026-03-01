import { setConnectionStatusStore, type ConnectionStatus } from '@/stores/connectionStatus';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_connection_status_updated';

export const setupConnectionListener = () => {
  return createListener<ConnectionStatus>(EVENT, setConnectionStatusStore, { warnOnly: true });
};
