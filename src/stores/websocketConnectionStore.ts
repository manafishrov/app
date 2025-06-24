import { Store } from '@tanstack/react-store';

type WebSocketConnection = {
  isConnected: boolean;
};

const webSocketConnectionStore = new Store<WebSocketConnection>({
  isConnected: false,
});

export { webSocketConnectionStore, type WebSocketConnection };
