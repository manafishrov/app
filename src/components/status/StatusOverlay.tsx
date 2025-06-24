import { ConnectionStatus } from '@/components/status/ConnectionStatus';
import { ScientificAttitudeIndicator } from '@/components/status/ScientificAttitudeIndicator';

function StatusOverlay() {
  return (
    <>
      <div className='absolute top-2 right-2 flex gap-2'>
        <ConnectionStatus />
      </div>
      <div className='absolute bottom-2 left-2'>
        <ScientificAttitudeIndicator />
      </div>
    </>
  );
}

export { StatusOverlay };
