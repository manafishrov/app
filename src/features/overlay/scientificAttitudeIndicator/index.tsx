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
  autoStabilization: boolean;
  style?: JSX.CSSProperties;
};

const HALF = 2;

const ScientificAttitudeIndicator: Component<ScientificAttitudeIndicatorProps> = (props) => {
  const center = (): number => props.size / HALF;
  const deltaYaw = (): number =>
    props.autoStabilization ? computeScientificDeltaYaw(props.desiredYaw, props.yaw) : 0;

  return (
    <div
      class='rounded-2xl border border-border/50 bg-background/50 text-foreground opacity-75 backdrop-blur-sm'
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
          deltaYaw={deltaYaw()}
        />
        <ActualIndicator
          size={props.size}
          pitch={props.pitch}
          roll={props.roll}
          deltaYaw={deltaYaw()}
        />
        <InfoTexts
          size={props.size}
          pitch={props.pitch}
          roll={props.roll}
          deltaYaw={deltaYaw()}
          autoStabilization={props.autoStabilization}
        />
      </svg>
    </div>
  );
};

export { ScientificAttitudeIndicator };
