import { useStore } from '@tanstack/react-store';
import { Thermometer } from 'lucide-react';

import { statusStore } from '@/stores/statusStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

function TemperatureIndicator() {
  const { temperature } = useStore(statusStore);
  const webSocketConnection = useStore(
    webSocketConnectionStore,
    (state) => state,
  );

  if (!webSocketConnection.isConnected) return null;

  return (
    <div className='flex items-center gap-1'>
      <Thermometer className='h-4 w-4' />
      <span className='text-xs'>{temperature.toFixed(1)} °C</span>
    </div>
  );
}

export { TemperatureIndicator };
