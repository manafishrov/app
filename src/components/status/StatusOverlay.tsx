import { AttitudeIndicator } from '@/components/status/AttitudeIndicator';
import { PressureIndicator } from '@/components/status/PressureIndicator';
import { StabilizationIndicator } from '@/components/status/StabilizationIndicator';
import { TemperatureIndicator } from '@/components/status/TemperatureIndicator';
import { WebSocketConnectionIndicator } from '@/components/status/WebSocketConnectionIndicator';

function StatusOverlay() {
  return (
    <>
      <div className="absolute top-2 left-2">
        <WebSocketConnectionIndicator />
      </div>
      <div className="absolute bottom-2 left-2">
        <AttitudeIndicator />
      </div>
      <div className="absolute top-1/2 -translate-y-1/2 left-2">
        <StabilizationIndicator />
      </div>
      <div className="absolute bottom-2 right-2 flex flex-row gap-2">
        <PressureIndicator />
        <TemperatureIndicator />
      </div>
    </>
  );
}

export { StatusOverlay };
