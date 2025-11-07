import { useStore } from '@tanstack/react-store';
import { CircuitBoardIcon, ThermometerIcon, WavesIcon } from 'lucide-react';
import { memo } from 'react';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const TemperatureIndicator = memo(function TemperatureIndicator() {
  const { waterTemperature, electronicsTemperature } = useStore(
    rovTelemetryStore,
    (state) => ({
      waterTemperature: state.waterTemperature,
      electronicsTemperature: state.electronicsTemperature,
    }),
  );
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );

  if (!isConnected) return;

  return (
    <>
      <div className='flex w-16 items-center gap-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
        <span className='relative'>
          <WavesIcon className='h-4 w-4' />
          <ThermometerIcon className='absolute top-0 -left-2.5 h-4 w-4' />
        </span>
        <span className='text-xs'>{electronicsTemperature.toFixed(1)}°C</span>
      </div>
      <div className='flex w-16 items-center gap-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
        <span className='relative'>
          <CircuitBoardIcon className='h-4 w-4' />
          <ThermometerIcon className='absolute top-0 -left-2.5 h-4 w-4' />
        </span>
        <span className='text-xs'>{waterTemperature.toFixed(1)}°C</span>
      </div>
    </>
  );
});

export { TemperatureIndicator };
