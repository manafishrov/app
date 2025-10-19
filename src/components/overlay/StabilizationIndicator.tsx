import { useStore } from '@tanstack/react-store';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

function StabilizationIndicator() {
  const { pitchStabilization, rollStabilization, depthHold } = useStore(
    rovStatusStore,
    (state) => ({
      pitchStabilization: state.pitchStabilization,
      rollStabilization: state.rollStabilization,
      depthHold: state.depthHold,
    }),
  );
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );

  if (!isConnected) return;

  return (
    <div className='flex flex-col gap-1 text-xs drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
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
            depthHold ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span>Depth</span>
      </div>
    </div>
  );
}

export { StabilizationIndicator };
