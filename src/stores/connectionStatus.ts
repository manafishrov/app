import { Store } from '@tanstack/react-store';

type ConnectionStatus = {
  isConnected: boolean;
  delay: number;
};

const connectionStatusStore = new Store<ConnectionStatus>({
  isConnected: false,
  delay: 0,
});

export { connectionStatusStore, type ConnectionStatus };
