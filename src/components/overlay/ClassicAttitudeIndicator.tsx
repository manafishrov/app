import type { Component, JSX } from 'solid-js';

import { For, Match, Show, Switch, createUniqueId } from 'solid-js';

type ClassicAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  yaw: number;
  desiredPitch: number;
  desiredRoll: number;
  desiredYaw: number;
  style?: JSX.CSSProperties;
};

const ClassicAttitudeIndicator: Component<ClassicAttitudeIndicatorProps> = (props) => {
  const center = () => props.size / 2;
  const radius = () => props.size / 2 - props.size * 0.05;
  const arcRadius = () => radius() - props.size * 0.05;
  const pitchScale = () => props.size / 120;
  const textSize = (ratio: number) => `${props.size * ratio}px`;
  const clipId = `instrument-face-${createUniqueId()}`;
  const deltaYaw = () => {
    const delta = props.desiredYaw - props.yaw;
    return ((delta + 540) % 360) - 180;
  };

  const pitchLines = [];
  for (let i = -90; i <= 90; i += 5) {
    if (i !== 0) pitchLines.push(i);
  }

  const rollTicks = [
    { deg: 0, type: 'triangle' },
    { deg: -10, type: 'long' },
    { deg: 10, type: 'long' },
    { deg: -20, type: 'long' },
    { deg: 20, type: 'long' },
    { deg: -30, type: 'long' },
    { deg: 30, type: 'long' },
    { deg: -45, type: 'triangle' },
    { deg: 45, type: 'triangle' },
    { deg: -60, type: 'short' },
    { deg: 60, type: 'short' },
    { deg: -90, type: 'short' },
    { deg: 90, type: 'short' },
  ];

  return (
    <div
      class='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl opacity-75 text-foreground flex flex-col items-center justify-center overflow-hidden'
      style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}
    >
      <svg width={props.size} height={props.size} viewBox={`0 0 ${props.size} ${props.size}`}>
        <defs>
          <clipPath id={clipId}>
            <circle cx={center()} cy={center()} r={radius()} />
          </clipPath>
        </defs>

        {/* Bezel */}
        <circle
          cx={center()}
          cy={center()}
          r={radius()}
          fill='transparent'
          stroke='currentColor'
          stroke-opacity='0.15'
          stroke-width={props.size * 0.01}
        />

        {/* Clipped area for moving parts */}
        <g clip-path={`url(#${clipId})`}>
          {/* Moving Sky/Ground and Pitch Ladder */}
          <g
            style={{
              transform: `rotate(${-props.roll}deg)`,
              'transform-origin': `${center()}px ${center()}px`,
            }}
          >
            <g style={{ transform: `translateY(${props.pitch * pitchScale()}px)` }}>
              {/* Sky */}
              <rect
                x={center() - props.size * 1.5}
                y={center() - props.size * 3}
                width={props.size * 3}
                height={props.size * 3}
                fill='#4A90D9'
              />
              {/* Ground */}
              <rect
                x={center() - props.size * 1.5}
                y={center()}
                width={props.size * 3}
                height={props.size * 3}
                fill='#6B4226'
              />
              {/* Horizon Line */}
              <line
                x1={center() - props.size * 1.5}
                y1={center()}
                x2={center() + props.size * 1.5}
                y2={center()}
                stroke='white'
                stroke-width={props.size * 0.01}
              />

              {/* Pitch Ladder */}
              <For each={pitchLines}>
                {(deg) => {
                  const isLong = Math.abs(deg) % 10 === 0;
                  const width = isLong ? props.size * 0.4 : props.size * 0.2;
                  const y = center() - deg * pitchScale();
                  return (
                    <g>
                      <line
                        x1={center() - width / 2}
                        y1={y}
                        x2={center() + width / 2}
                        y2={y}
                        stroke='white'
                        stroke-width={props.size * 0.005}
                      />
                      <Show when={isLong}>
                        <text
                          x={center() - width / 2 - props.size * 0.02}
                          y={y}
                          fill='white'
                          font-size={textSize(0.05)}
                          text-anchor='end'
                          alignment-baseline='middle'
                        >
                          {deg}
                        </text>
                        <text
                          x={center() + width / 2 + props.size * 0.02}
                          y={y}
                          fill='white'
                          font-size={textSize(0.05)}
                          text-anchor='start'
                          alignment-baseline='middle'
                        >
                          {deg}
                        </text>
                      </Show>
                    </g>
                  );
                }}
              </For>
            </g>
          </g>
        </g>

        {/* Fixed Roll Arc */}
        <g>
          <path
            d={`M ${center() - arcRadius()} ${center()} A ${arcRadius()} ${arcRadius()} 0 0 1 ${center() + arcRadius()} ${center()}`}
            fill='none'
            stroke='white'
            stroke-width={props.size * 0.01}
          />
          <For each={rollTicks}>
            {(tick) => (
              <g transform={`rotate(${tick.deg} ${center()} ${center()})`}>
                <Switch>
                  <Match when={tick.type === 'triangle'}>
                    <polygon
                      points={`
                        ${center()},${center() - arcRadius()} 
                        ${center() - props.size * 0.02},${center() - arcRadius() - props.size * 0.04} 
                        ${center() + props.size * 0.02},${center() - arcRadius() - props.size * 0.04}
                      `}
                      fill='white'
                    />
                  </Match>
                  <Match when={tick.type === 'long'}>
                    <line
                      x1={center()}
                      y1={center() - arcRadius()}
                      x2={center()}
                      y2={center() - arcRadius() - props.size * 0.04}
                      stroke='white'
                      stroke-width={props.size * 0.01}
                    />
                  </Match>
                  <Match when={tick.type === 'short'}>
                    <line
                      x1={center()}
                      y1={center() - arcRadius()}
                      x2={center()}
                      y2={center() - arcRadius() - props.size * 0.02}
                      stroke='white'
                      stroke-width={props.size * 0.01}
                    />
                  </Match>
                </Switch>
              </g>
            )}
          </For>
        </g>

        {/* Roll Pointer (moves with roll) */}
        <g transform={`rotate(${-props.roll} ${center()} ${center()})`}>
          <polygon
            points={`
              ${center()},${center() - arcRadius()} 
              ${center() - props.size * 0.02},${center() - arcRadius() + props.size * 0.045} 
              ${center() + props.size * 0.02},${center() - arcRadius() + props.size * 0.045}
            `}
            fill='white'
          />
        </g>

        {/* Fixed Aircraft Reference Symbol */}
        <g>
          <line
            x1={center() - props.size * 0.27}
            y1={center()}
            x2={center() - props.size * 0.055}
            y2={center()}
            stroke='#FFD700'
            stroke-width={props.size * 0.018}
            stroke-linecap='round'
          />
          <line
            x1={center() + props.size * 0.055}
            y1={center()}
            x2={center() + props.size * 0.27}
            y2={center()}
            stroke='#FFD700'
            stroke-width={props.size * 0.018}
            stroke-linecap='round'
          />
          <path
            d={`M ${center() - props.size * 0.09} ${center()} A ${props.size * 0.09} ${props.size * 0.09} 0 0 0 ${center() + props.size * 0.09} ${center()}`}
            fill='none'
            stroke='#FFD700'
            stroke-width={props.size * 0.018}
            stroke-linecap='round'
          />
          <line
            x1={center()}
            y1={center() + props.size * 0.015}
            x2={center()}
            y2={center() + props.size * 0.11}
            stroke='#FFD700'
            stroke-width={props.size * 0.018}
            stroke-linecap='round'
          />
          <circle cx={center()} cy={center()} r={props.size * 0.028} fill='#FFD700' />
        </g>

        {/* Text Labels */}
        <text
          x={props.size * 0.035}
          y={props.size * 0.085}
          fill='white'
          font-size={textSize(0.055)}
          text-anchor='start'
          font-family='monospace'
          font-variant-numeric='tabular-nums'
        >
          ΔYaw: {deltaYaw().toFixed(1)}°
        </text>
        <text
          x={props.size * 0.035}
          y={props.size - props.size * 0.03}
          fill='white'
          font-size={textSize(0.055)}
          text-anchor='start'
          font-family='monospace'
          font-variant-numeric='tabular-nums'
        >
          Pitch: {props.pitch.toFixed(1)}°
        </text>
        <text
          x={props.size * 0.62}
          y={props.size - props.size * 0.03}
          fill='white'
          font-size={textSize(0.055)}
          text-anchor='start'
          font-family='monospace'
          font-variant-numeric='tabular-nums'
        >
          Roll: {props.roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
};

export { ClassicAttitudeIndicator };
