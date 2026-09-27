import type { Component } from 'solid-js';

import type { OverlayWidget } from '@/stores/overlayTypes';

import { rovStatusStore } from '@/stores/rovStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { AttitudeStyle } from './attitudeStyle';
import { ClassicAttitudeIndicator } from './classicAttitudeIndicator';
import { Model3DAttitudeIndicator } from './model3DAttitudeIndicator';
import { useOverlayContentVisible } from './OverlayPreview';
import { ScientificAttitudeIndicator } from './scientificAttitudeIndicator';
import { WIDGET_CELL_SIZE, WIDGET_GUTTER } from './widgets/WidgetContent';
const PLACEHOLDER_SIZE_REM = 1;

/** Render at a stable square size; WidgetContent fits it to the available cells. */
const indicatorSize = (widget: OverlayWidget): number =>
  Math.min(widget.columnSpan, widget.rowSpan) * WIDGET_CELL_SIZE - WIDGET_GUTTER;

type SharedAttitudeProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  desiredYaw: number;
  autoStabilization: boolean;
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

  const shared = createMemo<SharedAttitudeProps>(() => ({
    size: indicatorSize(props.widget),
    pitch: rovTelemetryStore.pitch,
    roll: rovTelemetryStore.roll,
    yaw: rovTelemetryStore.yaw,
    desiredYaw: rovTelemetryStore.desiredYaw,
    autoStabilization: rovStatusStore.autoStabilization,
  }));

  return (
    <div class={isVisible() ? 'flex' : 'hidden'}>
      <AttitudeStyles style={props.style} shared={shared()} />
    </div>
  );
};

export { AttitudeIndicator };
