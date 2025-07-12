import { useStore } from '@tanstack/react-store';

import { Dimensional3DAttitudeIndicator } from '@/components/overlay/Dimensional3DAttitudeIndicator';
import { ScientificAttitudeIndicator } from '@/components/overlay/ScientificAttitudeIndicator';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { movementCommandStore } from '@/stores/movementCommandStore';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

function AttitudeIndicator() {
  const { pitch, roll, desiredPitch, desiredRoll } = useStore(
    rovTelemetryStore,
    (state) => ({
      pitch: state.pitch,
      roll: state.roll,
      desiredPitch: state.desiredPitch,
      desiredRoll: state.desiredRoll,
    }),
  );
  const config = useStore(configStore);
  const movementCommand = useStore(movementCommandStore);
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const size = isDesktop ? 220 : 160;

  if (!isConnected) return;

  switch (config?.attitudeIndicator) {
    case 'scientific':
      return (
        <ScientificAttitudeIndicator
          size={size}
          pitch={pitch}
          roll={roll}
          desiredPitch={desiredPitch}
          desiredRoll={desiredRoll}
        />
      );
    case 'dimensional3D':
      return (
        <Dimensional3DAttitudeIndicator
          size={size}
          pitch={pitch}
          roll={roll}
          rawYawInput={movementCommand[4]}
        />
      );
    default:
      return;
  }
}

export { AttitudeIndicator };
