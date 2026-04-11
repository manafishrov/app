import { createUniqueId, type Component, type JSX } from 'solid-js';

type ClassicAttitudeIndicatorProps = {
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

import { CONST } from './constants';
import { AircraftSymbol, PitchLadder, RollIndicator, TextOverlays } from './Marks';
import { getCenter, getRadius } from './math';

const ClassicAttitudeIndicator: Component<ClassicAttitudeIndicatorProps> = (props) => {
  const center = (): number => getCenter(props.size);
  const radius = (): number => getRadius(props.size);
  const clipId = `instrument-face-${createUniqueId()}`;

  return (
    <div
      class='flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-background/50 text-foreground opacity-75 backdrop-blur-sm'
      style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}
    >
      <svg width={props.size} height={props.size} viewBox={`0 0 ${props.size} ${props.size}`}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={center()} cy={center()} r={radius()} />
          </clipPath>
        </defs>
        <circle
          cx={center()}
          cy={center()}
          r={radius()}
          fill='transparent'
          stroke='currentColor'
          stroke-opacity={CONST.OPACITY}
          stroke-width={props.size * CONST.W_NORM}
        />
        <g clip-path={`url(#${clipId})`}>
          <PitchLadder size={props.size} center={center()} pitch={props.pitch} roll={props.roll} />
        </g>
        <RollIndicator size={props.size} center={center()} roll={props.roll} />
        <AircraftSymbol size={props.size} center={center()} />
        <TextOverlays
          size={props.size}
          center={center()}
          pitch={props.pitch}
          roll={props.roll}
          yaw={props.yaw}
          desiredYaw={props.desiredYaw}
          autoStabilization={props.autoStabilization}
        />
      </svg>
    </div>
  );
};

export { ClassicAttitudeIndicator };
