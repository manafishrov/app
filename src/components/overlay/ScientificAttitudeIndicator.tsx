import type { JSX } from 'solid-js';

import { type Component, For } from 'solid-js';

type ScientificAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  desiredPitch: number;
  desiredRoll: number;
  style?: JSX.CSSProperties;
};

const ScientificAttitudeIndicator: Component<ScientificAttitudeIndicatorProps> = (props) => {
  const center = () => props.size / 2;
  const pitchScale = () => props.size / 200;
  const textSize = (ratio: number) => `${props.size * ratio}px`;

  return (
    <div
      class='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl opacity-75 text-foreground'
      style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}
    >
      <svg
        width={props.size}
        height={props.size}
        viewBox={`-${props.size * 0.05} -${props.size * 0.05} ${props.size * 1.1} ${props.size * 1.1}`}
      >
        <circle
          cx={center()}
          cy={center()}
          r={center() - props.size * 0.05}
          fill='transparent'
          stroke='currentColor'
          stroke-opacity='0.15'
          stroke-width={props.size * 0.01}
        />

        <For each={[-90, -60, -30, -15, 0, 15, 30, 60, 90]}>
          {(deg) => (
            <g>
              <line
                x1={center() - props.size * 0.4}
                y1={center() + deg * pitchScale()}
                x2={center() + props.size * 0.4}
                y2={center() + deg * pitchScale()}
                stroke='currentColor'
                stroke-width={props.size * 0.005}
                stroke-opacity='0.5'
              />
              <text
                x={center() - props.size * 0.4 - props.size * 0.025}
                y={center() + deg * pitchScale() + props.size * 0.025}
                fill='currentColor'
                font-size={textSize(0.05)}
                text-anchor='end'
              >
                {deg}°
              </text>
              <text
                x={center() + props.size * 0.4 + props.size * 0.025}
                y={center() + deg * pitchScale() + props.size * 0.025}
                fill='currentColor'
                font-size={textSize(0.05)}
                text-anchor='start'
              >
                {deg}°
              </text>
            </g>
          )}
        </For>

        <For each={[-180, -135, -90, -45, 0, 45, 90, 135, 180]}>
          {(deg) => (
            <g transform={`rotate(${deg} ${center()} ${center()})`}>
              <line
                x1={center()}
                y1={props.size * 0.075}
                x2={center()}
                y2={props.size * 0.125}
                stroke='currentColor'
                stroke-width={props.size * 0.01}
              />
              {(deg <= -90 || (deg >= -45 && deg <= 90) || deg >= 135) && (
                <text
                  x={center()}
                  y={props.size * 0.17}
                  fill='currentColor'
                  font-size={textSize(0.06)}
                  text-anchor='middle'
                  alignment-baseline='middle'
                  transform={`
                    rotate(${-deg} ${center()} ${props.size * 0.17})
                    translate(0 ${deg === -180 || deg === 180 ? 2 : deg === 0 ? -2 : 1})
                  `}
                >
                  {deg === -180
                    ? 90
                    : deg === -135
                      ? -45
                      : deg === -90
                        ? 0
                        : deg === -45
                          ? 45
                          : deg === 0
                            ? -90
                            : deg === 45
                              ? -45
                              : deg === 90
                                ? 0
                                : deg === 135
                                  ? 45
                                  : deg === 180
                                    ? 90
                                    : ''}
                  °
                </text>
              )}
            </g>
          )}
        </For>

        <g
          style={{
            transform: `
              translate(${center()}px, ${center()}px)
              translateY(${-props.desiredPitch * pitchScale()}px)
              rotate(${props.desiredRoll}deg)
              translate(${-center()}px, ${-center()}px)
            `,
          }}
        >
          <line
            x1={center() - props.size * 0.25}
            y1={center()}
            x2={center() + props.size * 0.25}
            y2={center()}
            stroke='#ffff00'
            stroke-width={props.size * 0.01}
            stroke-dasharray={`${props.size * 0.02} ${props.size * 0.02}`}
          />
          <path
            d={`M ${-props.size * 0.02},${-props.size * 0.02} L 0,${-props.size * 0.04} L ${props.size * 0.02},${-props.size * 0.02}`}
            fill='#ffff00'
            transform={`translate(${center()} ${center()})`}
          />
        </g>

        <g
          style={{
            transform: `
              translate(${center()}px, ${center()}px)
              translateY(${-props.pitch * pitchScale()}px)
              rotate(${props.roll}deg)
              translate(${-center()}px, ${-center()}px)
            `,
          }}
        >
          <line
            x1={center() - props.size * 0.25}
            y1={center()}
            x2={center() - props.size * 0.075}
            y2={center()}
            stroke='#00ff00'
            stroke-width={props.size * 0.01}
          />
          <line
            x1={center() + props.size * 0.075}
            y1={center()}
            x2={center() + props.size * 0.25}
            y2={center()}
            stroke='#00ff00'
            stroke-width={props.size * 0.01}
          />
          <circle cx={center()} cy={center()} r={props.size * 0.02} fill='#00ff00' />
          <path
            d={`M ${-props.size * 0.02},${-props.size * 0.02} L 0,${-props.size * 0.04} L ${props.size * 0.02},${-props.size * 0.02}`}
            fill='#00ff00'
            transform={`translate(${center()} ${center()})`}
          />
        </g>

        <text
          x={props.size * 0.1}
          y={props.size - props.size * 0.1}
          fill='currentColor'
          font-size={textSize(0.06)}
        >
          Pitch: {props.pitch.toFixed(1)}°
        </text>
        <text
          x={props.size - props.size * 0.4}
          y={props.size - props.size * 0.1}
          fill='currentColor'
          font-size={textSize(0.06)}
        >
          Roll: {props.roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
};

export { ScientificAttitudeIndicator };
