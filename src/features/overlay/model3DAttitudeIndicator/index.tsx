import type { Component } from 'solid-js';

import {
  SVG_TEXT_FONT_SIZE_RATIO,
  SVG_TEXT_X_DELTA_YAW_RATIO,
  SVG_TEXT_X_PITCH_RATIO,
  SVG_TEXT_X_ROLL_RATIO,
  SVG_TEXT_Y_DELTA_YAW_RATIO,
  SVG_TEXT_Y_OFFSET_RATIO,
  SVG_VIEWBOX_OFFSET_RATIO,
  SVG_VIEWBOX_SIZE_RATIO,
} from './constants';
import {
  type Model3DAttitudeIndicatorProps,
  calculateDeltaYaw,
  loadModel,
  useModel3DAttitudeIndicator,
} from './Parts';

const OverlayText: Component<{
  xPosition: number;
  yPosition: number;
  size: number;
  label: string;
  value: number;
}> = (props) => (
  <text
    x={props.xPosition}
    y={props.yPosition}
    fill='currentColor'
    font-size={`${props.size * SVG_TEXT_FONT_SIZE_RATIO}px`}
  >
    {props.label}: {props.value.toFixed(1)}°
  </text>
);

const AttitudeOverlay: Component<{
  size: number;
  pitch: number;
  roll: number;
  deltaYaw: number;
  autoStabilization: boolean;
}> = (props) => (
  <svg
    width={props.size}
    height={props.size}
    viewBox={`-${props.size * SVG_VIEWBOX_OFFSET_RATIO} -${props.size * SVG_VIEWBOX_OFFSET_RATIO} ${props.size * SVG_VIEWBOX_SIZE_RATIO} ${props.size * SVG_VIEWBOX_SIZE_RATIO}`}
    class='pointer-events-none absolute top-0 left-0'
  >
    <Show when={props.autoStabilization}>
      <OverlayText
        xPosition={props.size * SVG_TEXT_X_DELTA_YAW_RATIO}
        yPosition={props.size * SVG_TEXT_Y_DELTA_YAW_RATIO}
        size={props.size}
        label='ΔYaw'
        value={props.deltaYaw}
      />
    </Show>
    <OverlayText
      xPosition={props.size * SVG_TEXT_X_PITCH_RATIO}
      yPosition={props.size - props.size * SVG_TEXT_Y_OFFSET_RATIO}
      size={props.size}
      label='Pitch'
      value={props.pitch}
    />
    <OverlayText
      xPosition={props.size - props.size * SVG_TEXT_X_ROLL_RATIO}
      yPosition={props.size - props.size * SVG_TEXT_Y_OFFSET_RATIO}
      size={props.size}
      label='Roll'
      value={props.roll}
    />
  </svg>
);

const Model3DAttitudeIndicator: Component<Model3DAttitudeIndicatorProps> = (props) => {
  const [gltf] = createResource(() => '/base.glb', loadModel);
  const deltaYaw = (): number =>
    props.autoStabilization ? calculateDeltaYaw(props.desiredYaw, props.yaw) : 0;

  const refs: { canvas?: HTMLCanvasElement } = {};

  useModel3DAttitudeIndicator(props, gltf, () => refs.canvas);

  return (
    <div
      class='relative overflow-hidden rounded-2xl border border-border/50 bg-background/50 text-foreground opacity-75 backdrop-blur-sm'
      style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}
    >
      <canvas
        ref={(element) => {
          refs.canvas = element;
        }}
        class='absolute inset-0'
        width={props.size}
        height={props.size}
      />
      <AttitudeOverlay
        size={props.size}
        pitch={props.pitch}
        roll={props.roll}
        deltaYaw={deltaYaw()}
        autoStabilization={props.autoStabilization}
      />
    </div>
  );
};

export { Model3DAttitudeIndicator };
