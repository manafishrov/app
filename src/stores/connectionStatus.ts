import { createStore, reconcile } from 'solid-js/store';

type ConnectionStatus = {
  isConnected: boolean;
  // Null until the first ping after connecting comes back.
  delay: number | null;
};

const [connectionStatusStore, setConnectionStatusStoreInternal] = createStore<ConnectionStatus>({
  isConnected: false,
  delay: null,
});

const setConnectionStatusStore = (value: ConnectionStatus): void => {
  setConnectionStatusStoreInternal(reconcile(value));
};

export { connectionStatusStore, setConnectionStatusStore, type ConnectionStatus };
