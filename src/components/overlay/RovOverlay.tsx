import { AttitudeIndicator } from '@/components/overlay/AttitudeIndicator';
import { ConnectionStatusIndicator } from '@/components/overlay/ConnectionStatusIndicator';
import { DepthIndicator } from '@/components/overlay/DepthIndicator';
import { StabilizationIndicator } from '@/components/overlay/StabilizationIndicator';
import { TemperatureIndicator } from '@/components/overlay/TemperatureIndicator';

function RovOverlay() {
  return (
    <>
      <div className='absolute top-2 left-2'>
        <ConnectionStatusIndicator />
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

export { RovOverlay };
