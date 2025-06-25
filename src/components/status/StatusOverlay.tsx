import { AttitudeIndicator } from '@/components/status/AttitudeIndicator';
import { DepthIndicator } from '@/components/status/DepthIndicator';
import { StabilizationIndicator } from '@/components/status/StabilizationIndicator';
import { TemperatureIndicator } from '@/components/status/TemperatureIndicator';
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
      <div className='absolute top-1/2 left-2 -translate-y-1/2'>
        <StabilizationIndicator />
      </div>
      <div className='absolute right-2 bottom-2 flex flex-row gap-2'>
        <DepthIndicator />
        <TemperatureIndicator />
      </div>
    </>
  );
}

export { StatusOverlay };
