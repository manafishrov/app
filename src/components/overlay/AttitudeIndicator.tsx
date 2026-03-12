import { type Component, createMemo } from 'solid-js';

import { ClassicAttitudeIndicator } from '@/components/overlay/ClassicAttitudeIndicator';
import { Model3DAttitudeIndicator } from '@/components/overlay/Model3DAttitudeIndicator';
import { ScientificAttitudeIndicator } from '@/components/overlay/ScientificAttitudeIndicator';
import { AttitudeIndicator as AttitudeIndicatorEnum, configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const SCIENTIFIC_ATTITUDE_SIZE = 180;

const AttitudeIndicator: Component = () => {
  const shadowStyle = createMemo(() => {
    let style: Record<string, string> = {};

    if (configStore.workIndicator && rovTelemetryStore.workIndicatorPercentage > 0) {
      const shadowIntensity = rovTelemetryStore.workIndicatorPercentage / 100;
      const shadowBlur = shadowIntensity * 20;
      const shadowSpread = shadowIntensity * 10;
      const shadowOpacity = shadowIntensity * 0.8;

      let b, g, r;
      if (shadowIntensity <= 0.5) {
        r = Math.round(shadowIntensity * 2 * 255);
        g = 255;
        b = 0;
      } else {
        r = 255;
        g = Math.round((1 - shadowIntensity) * 2 * 255);
        b = 0;
      }

      style = {
        'box-shadow': `0 0 ${shadowBlur}px ${shadowSpread}px rgba(${r}, ${g}, ${b}, ${shadowOpacity})`,
      };
    }

    return style;
  });

  return (
    <div class={connectionStatusStore.isConnected ? 'block' : 'hidden'}>
      {configStore.attitudeIndicator === AttitudeIndicatorEnum.scientific ? (
        <ScientificAttitudeIndicator
          size={SCIENTIFIC_ATTITUDE_SIZE}
          pitch={rovTelemetryStore.pitch}
          roll={rovTelemetryStore.roll}
          desiredPitch={rovTelemetryStore.desiredPitch}
          desiredRoll={rovTelemetryStore.desiredRoll}
          style={shadowStyle()}
        />
      ) : configStore.attitudeIndicator === AttitudeIndicatorEnum.model3D ? (
        <Model3DAttitudeIndicator
          size={SCIENTIFIC_ATTITUDE_SIZE}
          pitch={rovTelemetryStore.pitch}
          roll={rovTelemetryStore.roll}
          yaw={rovTelemetryStore.yaw}
          style={shadowStyle()}
        />
      ) : configStore.attitudeIndicator === AttitudeIndicatorEnum.classic ? (
        <ClassicAttitudeIndicator
          size={SCIENTIFIC_ATTITUDE_SIZE}
          pitch={rovTelemetryStore.pitch}
          roll={rovTelemetryStore.roll}
          yaw={rovTelemetryStore.yaw}
          desiredPitch={rovTelemetryStore.desiredPitch}
          desiredRoll={rovTelemetryStore.desiredRoll}
          desiredYaw={rovTelemetryStore.desiredYaw}
          style={shadowStyle()}
        />
      ) : (
        <div
          class='h-4 w-4 rounded-full bg-background/50 backdrop-blur-sm border border-border/50'
          style={shadowStyle()}
        />
      )}
    </div>
  );
};

export { AttitudeIndicator };
