import { useStore } from '@tanstack/react-store';

import { Dimensional3DAttitudeIndicator } from '@/components/status/Dimensional3DAttitudeIndicator';
import { ScientificAttitudeIndicator } from '@/components/status/ScientificAttitudeIndicator';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { configStore } from '@/stores/configStore';
import { movementInputStore } from '@/stores/movementInputStore';
import { statusStore } from '@/stores/statusStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

function AttitudeIndicator() {
  const status = useStore(statusStore, (state) => state);
  const config = useStore(configStore, (state) => state);
  const movementInput = useStore(movementInputStore, (state) => state);
  const webSocketConnection = useStore(
    webSocketConnectionStore,
    (state) => state,
  );
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!webSocketConnection.isConnected) return null;

  const size = isDesktop ? 220 : 160;

  switch (config?.attitudeIndicator) {
    case 'Scientific':
      return (
        <ScientificAttitudeIndicator
          size={size}
          pitch={status.pitch}
          roll={status.roll}
          desiredPitch={status.desiredPitch}
          desiredRoll={status.desiredRoll}
        />
      );
    case 'Dimensional3D':
      return (
        <Dimensional3DAttitudeIndicator
          size={size}
          pitch={status.pitch}
          roll={status.roll}
          rawYawInput={movementInput[4]}
        />
      );
    default:
      return null;
  }
}

export { AttitudeIndicator };
