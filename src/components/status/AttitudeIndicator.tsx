import { useStore } from '@tanstack/react-store';

import { Dimensional3DAttitudeIndicator } from '@/components/status/Dimensional3DAttitudeIndicator';
import { ScientificAttitudeIndicator } from '@/components/status/ScientificAttitudeIndicator';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { configStore } from '@/stores/configStore';
import { movementInputStore } from '@/stores/movementInputStore';
import { statusStore } from '@/stores/statusStore';
import { webSocketConnectionStore } from '@/stores/webSocketConnectionStore';

function AttitudeIndicator() {
  const { pitch, roll, desiredPitch, desiredRoll } = useStore(statusStore);
  const config = useStore(configStore);
  const movementInput = useStore(movementInputStore);
  const { isConnected } = useStore(webSocketConnectionStore);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!isConnected) return;

  const size = isDesktop ? 220 : 160;

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
          rawYawInput={movementInput[4]}
        />
      );
    default:
      return;
  }
}

export { AttitudeIndicator };
