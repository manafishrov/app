import { setConnectionStatusStore, type ConnectionStatus } from '@/stores/connectionStatus';
import { clearPendingRovConfigWrite } from '@/tauri/rovConfig';
import { createListener } from '@/tauri/core';

const EVENT = 'rov_connection_status_updated';

const handleConnectionStatusUpdate = (payload: ConnectionStatus): void => {
  setConnectionStatusStore(payload);

  if (!payload.isConnected) {
    clearPendingRovConfigWrite();
  }
};

export const setupConnectionListener = (): Promise<() => void> =>
  createListener<ConnectionStatus>(EVENT, handleConnectionStatusUpdate, { warnOnly: true });
