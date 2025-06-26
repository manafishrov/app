import { listen } from '@tauri-apps/api/event';
import { logWarn } from '@/lib/log';

import {
  type WebSocketConnection,
  webSocketConnectionStore,
} from '@/stores/webSocketConnectionStore';

async function initializeWebSocketConnectionListener() {
  try {
    await listen<WebSocketConnection>('websocket_connection', (event) => {
      webSocketConnectionStore.setState(() => event.payload);
    });
  } catch (error) {
    logWarn('Failed to listen to if websockets are connected:', error);
  }
}

void initializeWebSocketConnectionListener();
