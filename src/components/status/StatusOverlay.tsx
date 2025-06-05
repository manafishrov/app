import { AttitudeIndicator } from '@/components/status/AttitudeIndicator';
import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { WaterStatus } from '@/components/status/WaterStatus';

function StatusOverlay() {
  return (
    <>
      <div className='absolute top-2 right-2 flex gap-2'>
        <WaterStatus />
        <ConnectionStatus />
      </div>

      <div className='absolute bottom-2 left-2'>
        <AttitudeIndicator />
      </div>
    </>
  );
}

export { StatusOverlay };
