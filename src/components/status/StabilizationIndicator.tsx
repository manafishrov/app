import { useStore } from '@tanstack/react-store';

import { settingsStore } from '@/stores/settingsStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

function StabilizationIndicator() {
  const { pitchStabilization, rollStabilization, depthStabilization } =
    useStore(settingsStore);
  const webSocketConnection = useStore(
    webSocketConnectionStore,
    (state) => state,
  );

  if (!webSocketConnection.isConnected) return null;

  return (
    <div className='flex flex-col gap-1 text-xs'>
      <div className='flex items-center gap-2'>
        <span
          className={`h-2 w-2 rounded-full ${
            pitchStabilization ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>Pitch</span>
      </div>
      <div className='flex items-center gap-2'>
        <span
          className={`h-2 w-2 rounded-full ${
            rollStabilization ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>Roll</span>
      </div>
      <div className='flex items-center gap-2'>
        <span
          className={`h-2 w-2 rounded-full ${
            depthStabilization ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>Depth</span>
      </div>
    </div>
  );
}

export { StabilizationIndicator };
