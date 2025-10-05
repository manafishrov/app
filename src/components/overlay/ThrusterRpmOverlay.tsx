import { useStore } from '@tanstack/react-store';

import { ThrusterRpm } from '@/components/composites/ThrusterRpm';

import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

function ThrusterRpmOverlay() {
  const thrusterRpms = useStore(
    rovTelemetryStore,
    (state) => state.thrusterRpms,
  );
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const thrusterRpmOverlay = useStore(
    configStore,
    (state) => state?.thrusterRpmOverlay,
  );

  if (!isConnected || !thrusterRpmOverlay) return;

  return (
    <div className='flex flex-col gap-2 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
      {thrusterRpms.map((rpm, index) => (
        <div
          key={`thruster-${index + 1}`}
          className='flex items-center gap-1 text-xs'
        >
          <span>T{index + 1}:</span>
          <ThrusterRpm rpm={rpm} />
        </div>
      ))}
    </div>
  );
}

export { ThrusterRpmOverlay };
