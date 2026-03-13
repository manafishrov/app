import { createStore, reconcile } from 'solid-js/store';

type ConnectionStatus = {
  isConnected: boolean;
  delay: number;
};

const [connectionStatusStore, setConnectionStatusStoreInternal] = createStore<ConnectionStatus>({
  isConnected: false,
  delay: 0,
});

const setConnectionStatusStore = (value: ConnectionStatus): void => {
  setConnectionStatusStoreInternal(reconcile(value));
};

export { connectionStatusStore, setConnectionStatusStore, type ConnectionStatus };
