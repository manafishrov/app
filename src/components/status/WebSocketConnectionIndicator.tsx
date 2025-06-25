import { useStore } from '@tanstack/react-store';

import { webSocketConnectionStore } from '@/stores/websocketConnectionStore';

function WebSocketConnectionIndicator() {
  const webSocketConnection = useStore(
    webSocketConnectionStore,
    (state) => state,
  );

  return (
    <div className='flex items-center space-x-2'>
      <div
        className={`h-3 w-3 rounded-full ${
          webSocketConnection.isConnected ? 'bg-green-500' : 'bg-destructive'
        }`}
      />
      {webSocketConnection.isConnected && (
        <span className='text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
          {webSocketConnection.delay} ms
        </span>
      )}
    </div>
  );
}

export { WebSocketConnectionIndicator };
