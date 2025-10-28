import { RecordingIndicator } from './RecordingIndicator';

import { AttitudeIndicator } from '@/components/overlay/AttitudeIndicator';
import { BatteryIndicator } from '@/components/overlay/BatteryIndicator';
import { ConnectionStatusIndicator } from '@/components/overlay/ConnectionStatusIndicator';
import { DepthIndicator } from '@/components/overlay/DepthIndicator';
import { StabilizationIndicator } from '@/components/overlay/StabilizationIndicator';
import { TemperatureIndicator } from '@/components/overlay/TemperatureIndicator';
import { ThrusterRpmOverlay } from '@/components/overlay/ThrusterRpmOverlay';

function RovOverlay() {
  return (
    <>
      <div className='absolute top-2 left-2 grid grid-cols-2 gap-2'>
        <ConnectionStatusIndicator />
        <RecordingIndicator />
      </div>
      <div className='absolute bottom-2 left-2'>
        <AttitudeIndicator />
      </div>
      <div className='absolute top-1/2 left-2 -translate-y-1/2'>
        <StabilizationIndicator />
      </div>
      <div className='absolute top-1/2 right-2 -translate-y-1/2'>
        <ThrusterRpmOverlay />
      </div>
      <div className='absolute right-2 bottom-2 flex flex-row gap-2'>
        <DepthIndicator />
        <TemperatureIndicator />
        <BatteryIndicator />
      </div>
    </>
  );
}

export { RovOverlay };
