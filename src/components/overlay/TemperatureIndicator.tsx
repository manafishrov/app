import { useStore } from '@tanstack/react-store';
import { ThermometerIcon } from 'lucide-react';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

function TemperatureIndicator() {
  const temperature = useStore(rovTelemetryStore, (state) => state.temperature);
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );

  if (!isConnected) return;

  return (
    <div className='flex items-center gap-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
      <ThermometerIcon className='h-4 w-4' />
      <span className='text-xs'>{temperature.toFixed(1)} °C</span>
    </div>
  );
}

export { TemperatureIndicator };
