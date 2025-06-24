import { listen } from '@tauri-apps/api/event';

import {
  type WebSocketConnection,
  webSocketConnectionStore,
} from '@/stores/websocketConnectionStore';

async function initializeWebSocketConnectionListener() {
  try {
    await listen<WebSocketConnection>('websocket_connection', (event) => {
      webSocketConnectionStore.setState(() => event.payload);
    });
  } catch (error) {
    console.error('Failed to listen to if websockets are connected:', error);
  }
}

void initializeWebSocketConnectionListener();
