import { type Component, createMemo, Match, Switch } from 'solid-js';

import { AttitudeIndicator as AttitudeIndicatorEnum, configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { ClassicAttitudeIndicator } from './classicAttitudeIndicator';
import { Model3DAttitudeIndicator } from './model3DAttitudeIndicator';
import { ScientificAttitudeIndicator } from './scientificAttitudeIndicator';

const SCIENTIFIC_ATTITUDE_SIZE = 180;

const PERCENTAGE_DIVISOR = 100;
const MAX_SHADOW_BLUR = 20;
const MAX_SHADOW_SPREAD = 10;
const MAX_SHADOW_OPACITY = 0.8;
const HALF_INTENSITY = 0.5;
const INTENSITY_MULTIPLIER = 2;
const MAX_COLOR_VALUE = 255;

const calculateShadowColor = (
  shadowIntensity: number,
): { redValue: number; greenValue: number; blueValue: number } => {
  if (shadowIntensity <= HALF_INTENSITY) {
    return {
      redValue: Math.round(shadowIntensity * INTENSITY_MULTIPLIER * MAX_COLOR_VALUE),
      greenValue: MAX_COLOR_VALUE,
      blueValue: 0,
    };
  }
  return {
    redValue: MAX_COLOR_VALUE,
    greenValue: Math.round((1 - shadowIntensity) * INTENSITY_MULTIPLIER * MAX_COLOR_VALUE),
    blueValue: 0,
  };
};

const calculateShadowStyle = (workIndicatorPercentage: number): Record<string, string> => {
  const shadowIntensity = workIndicatorPercentage / PERCENTAGE_DIVISOR;
  const shadowBlur = shadowIntensity * MAX_SHADOW_BLUR;
  const shadowSpread = shadowIntensity * MAX_SHADOW_SPREAD;
  const shadowOpacity = shadowIntensity * MAX_SHADOW_OPACITY;

  const { redValue, greenValue, blueValue } = calculateShadowColor(shadowIntensity);

  return {
    'box-shadow': `0 0 ${shadowBlur}px ${shadowSpread}px rgba(${redValue}, ${greenValue}, ${blueValue}, ${shadowOpacity})`,
  };
};

const AttitudeIndicatorContent: Component<{ style: Record<string, string> }> = (props) => (
  <Switch
    fallback={
      <div
        class='h-4 w-4 rounded-full bg-background/50 backdrop-blur-sm border border-border/50'
        style={props.style}
      />
    }
  >
    <Match when={configStore.attitudeIndicator === AttitudeIndicatorEnum.scientific}>
      <ScientificAttitudeIndicator
        size={SCIENTIFIC_ATTITUDE_SIZE}
        pitch={rovTelemetryStore.pitch}
        roll={rovTelemetryStore.roll}
        yaw={rovTelemetryStore.yaw}
        desiredPitch={rovTelemetryStore.desiredPitch}
        desiredRoll={rovTelemetryStore.desiredRoll}
        desiredYaw={rovTelemetryStore.desiredYaw}
        style={props.style}
      />
    </Match>
    <Match when={configStore.attitudeIndicator === AttitudeIndicatorEnum.model3D}>
      <Model3DAttitudeIndicator
        size={SCIENTIFIC_ATTITUDE_SIZE}
        pitch={rovTelemetryStore.pitch}
        roll={rovTelemetryStore.roll}
        yaw={rovTelemetryStore.yaw}
        desiredYaw={rovTelemetryStore.desiredYaw}
        style={props.style}
      />
    </Match>
    <Match when={configStore.attitudeIndicator === AttitudeIndicatorEnum.classic}>
      <ClassicAttitudeIndicator
        size={SCIENTIFIC_ATTITUDE_SIZE}
        pitch={rovTelemetryStore.pitch}
        roll={rovTelemetryStore.roll}
        yaw={rovTelemetryStore.yaw}
        desiredPitch={rovTelemetryStore.desiredPitch}
        desiredRoll={rovTelemetryStore.desiredRoll}
        desiredYaw={rovTelemetryStore.desiredYaw}
        style={props.style}
      />
    </Match>
  </Switch>
);

const AttitudeIndicator: Component = () => {
  const shadowStyle = createMemo(() => {
    if (configStore.workIndicator && rovTelemetryStore.workIndicatorPercentage > 0) {
      return calculateShadowStyle(rovTelemetryStore.workIndicatorPercentage);
    }
    return {};
  });

  return (
    <div class={connectionStatusStore.isConnected ? 'block' : 'hidden'}>
      <AttitudeIndicatorContent style={shadowStyle()} />
    </div>
  );
};

export { AttitudeIndicator };
