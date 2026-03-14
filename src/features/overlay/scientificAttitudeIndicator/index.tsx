import type { Component, JSX } from 'solid-js';

import {
  CIRCLE_RADIUS_OFFSET,
  CIRCLE_STROKE_WIDTH,
  computeScientificDeltaYaw,
  VIEWBOX_OFFSET,
  VIEWBOX_SIZE,
} from './constants';
import { ActualIndicator, DesiredIndicator, InfoTexts, PitchLines, YawLines } from './Parts';

type ScientificAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  desiredPitch: number;
  desiredRoll: number;
  desiredYaw: number;
  style?: JSX.CSSProperties;
};

const HALF = 2;

const ScientificAttitudeIndicator: Component<ScientificAttitudeIndicatorProps> = (props) => {
  const center = (): number => props.size / HALF;
  const deltaYaw = computeScientificDeltaYaw(props.desiredYaw, props.yaw);

  return (
    <div
      class='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl opacity-75 text-foreground'
      style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}
    >
      <svg
        width={props.size}
        height={props.size}
        viewBox={`-${props.size * VIEWBOX_OFFSET} -${props.size * VIEWBOX_OFFSET} ${props.size * VIEWBOX_SIZE} ${props.size * VIEWBOX_SIZE}`}
      >
        <circle
          cx={center()}
          cy={center()}
          r={center() - props.size * CIRCLE_RADIUS_OFFSET}
          fill='transparent'
          stroke='currentColor'
          stroke-opacity='0.15'
          stroke-width={props.size * CIRCLE_STROKE_WIDTH}
        />
        <PitchLines size={props.size} />
        <YawLines size={props.size} />
        <DesiredIndicator
          size={props.size}
          desiredPitch={props.desiredPitch}
          desiredRoll={props.desiredRoll}
          deltaYaw={deltaYaw}
        />
        <ActualIndicator
          size={props.size}
          pitch={props.pitch}
          roll={props.roll}
          deltaYaw={deltaYaw}
        />
        <InfoTexts size={props.size} pitch={props.pitch} roll={props.roll} deltaYaw={deltaYaw} />
      </svg>
    </div>
  );
};

export { ScientificAttitudeIndicator };
