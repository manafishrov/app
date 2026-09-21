import type { Component } from 'solid-js';

import { OVERLAY_REFERENCE_CELL, type OverlayWidget } from '@/stores/overlayTypes';
import { rovStatusStore } from '@/stores/rovStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { AttitudeStyle } from './attitudeStyle';
import { ClassicAttitudeIndicator } from './classicAttitudeIndicator';
import { Model3DAttitudeIndicator } from './model3DAttitudeIndicator';
import { useOverlayContentVisible } from './OverlayPreview';
import { ScientificAttitudeIndicator } from './scientificAttitudeIndicator';

const PERCENTAGE_DIVISOR = 100;
const MAX_SHADOW_BLUR = 20;
const MAX_SHADOW_SPREAD = 10;
const MAX_SHADOW_OPACITY = 0.8;
const HALF_INTENSITY = 0.5;
const INTENSITY_MULTIPLIER = 2;
const MAX_COLOR_VALUE = 255;
const PLACEHOLDER_SIZE_REM = 1;

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

/**
 * The indicator fills the grid rectangle it was given. Sizing from the span in
 * *reference* pixels (rather than measuring) keeps it in step with the zoom the
 * grid applies, so it lands exactly on its cells at any camera size.
 */
const indicatorSize = (widget: OverlayWidget): number =>
  Math.min(widget.columnSpan, widget.rowSpan) * OVERLAY_REFERENCE_CELL;

type SharedAttitudeProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  desiredYaw: number;
  autoStabilization: boolean;
  style: Record<string, string>;
};

const AttitudeStyles: Component<{ style: AttitudeStyle; shared: SharedAttitudeProps }> = (
  props,
) => (
  <Switch
    fallback={
      <div
        class='rounded-full border border-border/50 bg-background/50 backdrop-blur-sm'
        style={{
          width: `${PLACEHOLDER_SIZE_REM}rem`,
          height: `${PLACEHOLDER_SIZE_REM}rem`,
          ...props.shared.style,
        }}
      />
    }
  >
    <Match when={props.style === AttitudeStyle.scientific}>
      <ScientificAttitudeIndicator
        {...props.shared}
        desiredPitch={rovTelemetryStore.desiredPitch}
        desiredRoll={rovTelemetryStore.desiredRoll}
      />
    </Match>
    <Match when={props.style === AttitudeStyle.model3D}>
      <Model3DAttitudeIndicator {...props.shared} />
    </Match>
    <Match when={props.style === AttitudeStyle.classic}>
      <ClassicAttitudeIndicator
        {...props.shared}
        desiredPitch={rovTelemetryStore.desiredPitch}
        desiredRoll={rovTelemetryStore.desiredRoll}
      />
    </Match>
  </Switch>
);

type AttitudeIndicatorProps = {
  style: AttitudeStyle;
  widget: OverlayWidget;
};

const AttitudeIndicator: Component<AttitudeIndicatorProps> = (props) => {
  const isVisible = useOverlayContentVisible();

  const shadowStyle = createMemo(() => {
    if (
      props.widget.options.workIndicator === true &&
      rovTelemetryStore.workIndicatorPercentage > 0
    ) {
      return calculateShadowStyle(rovTelemetryStore.workIndicatorPercentage);
    }
    return {};
  });

  const shared = createMemo<SharedAttitudeProps>(() => ({
    size: indicatorSize(props.widget),
    pitch: rovTelemetryStore.pitch,
    roll: rovTelemetryStore.roll,
    yaw: rovTelemetryStore.yaw,
    desiredYaw: rovTelemetryStore.desiredYaw,
    autoStabilization: rovStatusStore.autoStabilization,
    style: shadowStyle(),
  }));

  return (
    <div class={isVisible() ? 'flex' : 'hidden'}>
      <AttitudeStyles style={props.style} shared={shared()} />
    </div>
  );
};

export { AttitudeIndicator };
