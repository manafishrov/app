import { useStore } from '@tanstack/react-store';

import { ThrusterRpm } from '@/components/composites/ThrusterRpm';

import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

function ThrusterItem({ index }: { index: number }) {
  const rpm = useStore(
    rovTelemetryStore,
    (state) => state.thrusterRpms[index]!,
  );

  return (
    <div className='flex items-center gap-1 text-xs'>
      <ThrusterRpm rpm={rpm} />
      <span className='w-2'>T{index + 1}</span>
    </div>
  );
}

function ThrusterRpmOverlay() {
  const thrusterRpmsLength = useStore(
    rovTelemetryStore,
    (state) => state.thrusterRpms.length,
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
    <div className='flex flex-col items-end gap-2 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
      {Array.from({ length: thrusterRpmsLength }, (_, i) => i).map((index) => (
        <ThrusterItem key={`thruster-${index + 1}`} index={index} />
      ))}
    </div>
  );
}

export { ThrusterRpmOverlay };
