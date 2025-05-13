import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { GyroscopeVisualization } from '@/components/status/GyroscopeVisualization';
import { WaterStatus } from '@/components/status/WaterStatus';

function StatusOverlay() {
  return (
    <>
      <div className='absolute top-2 right-2 flex gap-2'>
        <ConnectionStatus />
        <WaterStatus />
      </div>

      <div className='absolute bottom-2 left-2'>
        <GyroscopeVisualization />
      </div>
    </>
  );
}

export { StatusOverlay };
