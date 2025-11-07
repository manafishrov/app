import { useStore } from '@tanstack/react-store';
import { memo, useMemo } from 'react';

import { Dimensional3DAttitudeIndicator } from '@/components/overlay/Dimensional3DAttitudeIndicator';
import { ScientificAttitudeIndicator } from '@/components/overlay/ScientificAttitudeIndicator';

import { useMediaQuery } from '@/hooks/useMediaQuery';

import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { directionVectorStore } from '@/stores/directionVector';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const AttitudeIndicator = memo(function AttitudeIndicator() {
  const { pitch, roll, desiredPitch, desiredRoll, workIndicatorPercentage } =
    useStore(rovTelemetryStore, (state) => ({
      pitch: state.pitch,
      roll: state.roll,
      desiredPitch: state.desiredPitch,
      desiredRoll: state.desiredRoll,
      workIndicatorPercentage: state.workIndicatorPercentage,
    }));
  const { attitudeIndicator, workIndicator } = useStore(
    configStore,
    (state) => ({
      attitudeIndicator: state?.attitudeIndicator,
      workIndicator: state?.workIndicator,
    }),
  );
  const directionVector = useStore(directionVectorStore);
  const isConnected = useStore(
    connectionStatusStore,
    (state) => state.isConnected,
  );
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const size = isDesktop ? 220 : 160;

  const { shadowStyle, cornerIndicatorStyle } = useMemo(() => {
    let shadowStyle: React.CSSProperties = {};
    let cornerIndicatorStyle: React.CSSProperties = {};

    if (workIndicator && workIndicatorPercentage > 0) {
      const shadowIntensity = workIndicatorPercentage / 100;
      const shadowBlur = shadowIntensity * 20;
      const shadowSpread = shadowIntensity * 10;
      const shadowOpacity = shadowIntensity * 0.8;

      let r, g, b;
      if (shadowIntensity <= 0.5) {
        r = Math.round(shadowIntensity * 2 * 255);
        g = 255;
        b = 0;
      } else {
        r = 255;
        g = Math.round((1 - shadowIntensity) * 2 * 255);
        b = 0;
      }

      shadowStyle = {
        boxShadow: `0 0 ${shadowBlur}px ${shadowSpread}px rgba(${r}, ${g}, ${b}, ${shadowOpacity})`,
      };

      cornerIndicatorStyle = {
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${shadowOpacity * 0.3})`,
        boxShadow: `0 0 ${shadowBlur}px ${shadowSpread}px rgba(${r}, ${g}, ${b}, ${shadowOpacity}), inset 0 0 ${shadowBlur}px ${shadowSpread}px rgba(${r}, ${g}, ${b}, ${shadowOpacity * 0.5})`,
      };
    }

    return { shadowStyle, cornerIndicatorStyle };
  }, [workIndicator, workIndicatorPercentage]);

  if (!isConnected) return;

  switch (attitudeIndicator) {
    case 'scientific':
      return (
        <ScientificAttitudeIndicator
          size={size}
          pitch={pitch}
          roll={roll}
          desiredPitch={desiredPitch}
          desiredRoll={desiredRoll}
          style={shadowStyle}
        />
      );
    case 'dimensional3D':
      return (
        <Dimensional3DAttitudeIndicator
          size={size}
          pitch={pitch}
          roll={roll}
          rawYawInput={directionVector[4]}
          style={shadowStyle}
        />
      );
    default:
      return (
        <div className='h-4 w-4 rounded-full' style={cornerIndicatorStyle} />
      );
  }
});

export { AttitudeIndicator };
