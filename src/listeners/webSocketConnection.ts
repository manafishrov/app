import { listen } from '@tauri-apps/api/event';

import { webSocketConnectionStore } from '@/stores/websocketConnectionStore';

async function initializeWebSocketConnectionListener() {
  try {
    await listen<boolean>('websocket_connection', (event) => {
      webSocketConnectionStore.setState(() => ({ isConnected: event.payload }));
    });
  } catch (error) {
    console.error('Failed to listen to if websockets are connected:', error);
  }
}

void initializeWebSocketConnectionListener();
