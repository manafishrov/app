import { type Component, createResource } from 'solid-js';

import {
  SVG_TEXT_FONT_SIZE_RATIO,
  SVG_TEXT_X_PITCH_RATIO,
  SVG_TEXT_X_ROLL_RATIO,
  SVG_TEXT_Y_OFFSET_RATIO,
  SVG_VIEWBOX_OFFSET_RATIO,
  SVG_VIEWBOX_SIZE_RATIO,
} from './model3DAttitudeIndicator.constants';
import {
  type Model3DAttitudeIndicatorProps,
  loadModel,
  useModel3DAttitudeIndicator,
} from './Model3DAttitudeIndicator.parts';

const Model3DAttitudeIndicator: Component<Model3DAttitudeIndicatorProps> = (props) => {
  const [gltf] = createResource(() => '/base.glb', loadModel);

  const refs: { canvas?: HTMLCanvasElement } = {};

  useModel3DAttitudeIndicator(props, gltf, () => refs.canvas);

  return (
    <div
      class='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl opacity-75 text-foreground relative overflow-hidden'
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
      <svg
        width={props.size}
        height={props.size}
        viewBox={`-${props.size * SVG_VIEWBOX_OFFSET_RATIO} -${props.size * SVG_VIEWBOX_OFFSET_RATIO} ${props.size * SVG_VIEWBOX_SIZE_RATIO} ${props.size * SVG_VIEWBOX_SIZE_RATIO}`}
        class='absolute top-0 left-0 pointer-events-none'
      >
        <text
          x={props.size * SVG_TEXT_X_PITCH_RATIO}
          y={props.size - props.size * SVG_TEXT_Y_OFFSET_RATIO}
          fill='currentColor'
          font-size={`${props.size * SVG_TEXT_FONT_SIZE_RATIO}px`}
        >
          Pitch: {props.pitch.toFixed(1)}°
        </text>
        <text
          x={props.size - props.size * SVG_TEXT_X_ROLL_RATIO}
          y={props.size - props.size * SVG_TEXT_Y_OFFSET_RATIO}
          fill='currentColor'
          font-size={`${props.size * SVG_TEXT_FONT_SIZE_RATIO}px`}
        >
          Roll: {props.roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
};

export { Model3DAttitudeIndicator };
