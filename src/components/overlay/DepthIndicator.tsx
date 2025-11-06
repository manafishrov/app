import { useStore } from '@tanstack/react-store';
import { RulerDimensionLineIcon } from 'lucide-react';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

function DepthIndicator() {
  const depth = useStore(rovTelemetryStore, (state) => state.depth);
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );

  if (!isConnected) return;

  return (
    <div className='flex w-14 items-center gap-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
      <RulerDimensionLineIcon className='h-4 w-4 rotate-90' />
      <span className='text-xs'>{depth.toFixed(1)}m</span>
    </div>
  );
}

export { DepthIndicator };
