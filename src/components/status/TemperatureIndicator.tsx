import { useStore } from '@tanstack/react-store';
import { ThermometerIcon } from 'lucide-react';

import { statusStore } from '@/stores/statusStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

function TemperatureIndicator() {
  const { temperature } = useStore(statusStore);
  const webSocketConnection = useStore(webSocketConnectionStore);

  if (!webSocketConnection.isConnected) return null;

  return (
    <div className='flex items-center gap-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
      <ThermometerIcon className='h-4 w-4' />
      <span className='text-xs'>{temperature.toFixed(1)} °C</span>
    </div>
  );
}

export { TemperatureIndicator };
