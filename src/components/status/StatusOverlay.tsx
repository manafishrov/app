import { AttitudeIndicator } from '@/components/status/AttitudeIndicator';
import { WebSocketConnectionIndicator } from '@/components/status/WebSocketConnectionIndicator';

function StatusOverlay() {
  return (
    <>
      <div className='absolute top-2 left-2'>
        <WebSocketConnectionIndicator />
      </div>
      <div className='absolute bottom-2 left-2'>
        <AttitudeIndicator />
      </div>
    </>
  );
}

export { StatusOverlay };
