import { Store } from '@tanstack/react-store';

type WebSocketConnection = {
  isConnected: boolean;
  delay: number;
};

const webSocketConnectionStore = new Store<WebSocketConnection>({
  isConnected: false,
  delay: 0,
});

export { webSocketConnectionStore, type WebSocketConnection };
