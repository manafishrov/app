import { type Component, type JSX, For, Match, Show, Switch, createUniqueId } from 'solid-js';

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

const CONST = {
  HALF: 2,
  RAD_OFF: 0.05,
  P_SCALE: 120,
  YAW_OFF: 540,
  YAW_MOD: 360,
  YAW_SUB: 180,
  P_MIN: -90,
  P_MAX: 90,
  P_STEP: 5,
  P_MOD: 10,
  OPACITY: '0.15',
  W_THIN: 0.005,
  W_NORM: 0.01,
  W_THICK: 0.018,
  R_OFF: 1.5,
  R_SIZE: 3,
  L_LONG: 0.4,
  L_SHORT: 0.2,
  T_OFF_X: 0.02,
  T_NORM: 0.05,
  T_LARGE: 0.055,
  TICK_Y1: 0.04,
  TICK_Y2: 0.02,
  PTR_Y: 0.045,
  AC_OUT: 0.27,
  AC_IN: 0.055,
  AC_ARC: 0.09,
  AC_T1: 0.015,
  AC_T2: 0.11,
  AC_RAD: 0.028,
  TX_L: 0.01,
  TX_R: 0.58,
  TY_T: 0.05,
  TY_B: 0.01,
  DEC: 1,
} as const;

const getCenter = (size: number): number => size / CONST.HALF;
const getRadius = (size: number): number => getCenter(size) - size * CONST.RAD_OFF;
const getArcRadius = (size: number): number => getRadius(size) - size * CONST.RAD_OFF;
const getPitchScale = (size: number): number => size / CONST.P_SCALE;
const getTextSize = (size: number, ratio: number): string => `${size * ratio}px`;

const getDeltaYaw = (dYaw: number, yaw: number): number =>
  ((dYaw - yaw + CONST.YAW_OFF) % CONST.YAW_MOD) - CONST.YAW_SUB;

const getPitchLines = (): number[] => {
  const lines: number[] = [];
  for (let index: number = CONST.P_MIN; index <= CONST.P_MAX; index += CONST.P_STEP) {
    if (index !== 0) {
      lines.push(index);
    }
  }
  return lines;
};

const ROLL_TICKS = [
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
] as const;

type SubProps = { size: number; center: number };

const PitchLadder: Component<SubProps & { pitch: number; roll: number }> = (props) => (
  <g style={{ transform: `rotate(${-props.roll}deg)`, 'transform-origin': `${props.center}px ${props.center}px` }}>
    <g style={{ transform: `translateY(${props.pitch * getPitchScale(props.size)}px)` }}>
      <rect x={props.center - props.size * CONST.R_OFF} y={props.center - props.size * CONST.R_SIZE} width={props.size * CONST.R_SIZE} height={props.size * CONST.R_SIZE} fill='#4A90D9' />
      <rect x={props.center - props.size * CONST.R_OFF} y={props.center} width={props.size * CONST.R_SIZE} height={props.size * CONST.R_SIZE} fill='#6B4226' />
      <line x1={props.center - props.size * CONST.R_OFF} y1={props.center} x2={props.center + props.size * CONST.R_OFF} y2={props.center} stroke='white' stroke-width={props.size * CONST.W_NORM} />
      <For each={getPitchLines()}>
        {(deg) => {
          const isLong = Math.abs(deg) % CONST.P_MOD === 0;
          const width = isLong ? props.size * CONST.L_LONG : props.size * CONST.L_SHORT;
          const posY = props.center - deg * getPitchScale(props.size);
          return (
            <g>
              <line x1={props.center - width / CONST.HALF} y1={posY} x2={props.center + width / CONST.HALF} y2={posY} stroke='white' stroke-width={props.size * CONST.W_THIN} />
              <Show when={isLong}>
                <text x={props.center - width / CONST.HALF - props.size * CONST.T_OFF_X} y={posY} fill='white' font-size={getTextSize(props.size, CONST.T_NORM)} text-anchor='end' alignment-baseline='middle'>{deg}</text>
                <text x={props.center + width / CONST.HALF + props.size * CONST.T_OFF_X} y={posY} fill='white' font-size={getTextSize(props.size, CONST.T_NORM)} text-anchor='start' alignment-baseline='middle'>{deg}</text>
              </Show>
            </g>
          );
        }}
      </For>
    </g>
  </g>
);

const RollIndicator: Component<SubProps & { roll: number }> = (props) => (
  <>
    <g>
      <path d={`M ${props.center - getArcRadius(props.size)} ${props.center} A ${getArcRadius(props.size)} ${getArcRadius(props.size)} 0 0 1 ${props.center + getArcRadius(props.size)} ${props.center}`} fill='none' stroke='white' stroke-width={props.size * CONST.W_NORM} />
      <For each={ROLL_TICKS}>
        {(tick) => (
          <g transform={`rotate(${tick.deg} ${props.center} ${props.center})`}>
            <Switch>
              <Match when={tick.type === 'triangle'}>
                <polygon points={`${props.center},${props.center - getArcRadius(props.size)} ${props.center - props.size * CONST.T_OFF_X},${props.center - getArcRadius(props.size) - props.size * CONST.TICK_Y1} ${props.center + props.size * CONST.T_OFF_X},${props.center - getArcRadius(props.size) - props.size * CONST.TICK_Y1}`} fill='white' />
              </Match>
              <Match when={tick.type === 'long'}>
                <line x1={props.center} y1={props.center - getArcRadius(props.size)} x2={props.center} y2={props.center - getArcRadius(props.size) - props.size * CONST.TICK_Y1} stroke='white' stroke-width={props.size * CONST.W_NORM} />
              </Match>
              <Match when={tick.type === 'short'}>
                <line x1={props.center} y1={props.center - getArcRadius(props.size)} x2={props.center} y2={props.center - getArcRadius(props.size) - props.size * CONST.TICK_Y2} stroke='white' stroke-width={props.size * CONST.W_NORM} />
              </Match>
            </Switch>
          </g>
        )}
      </For>
    </g>
    <g transform={`rotate(${-props.roll} ${props.center} ${props.center})`}>
      <polygon points={`${props.center},${props.center - getArcRadius(props.size)} ${props.center - props.size * CONST.T_OFF_X},${props.center - getArcRadius(props.size) + props.size * CONST.PTR_Y} ${props.center + props.size * CONST.T_OFF_X},${props.center - getArcRadius(props.size) + props.size * CONST.PTR_Y}`} fill='white' />
    </g>
  </>
);

const AircraftSymbol: Component<SubProps> = (props) => (
  <g>
    <line x1={props.center - props.size * CONST.AC_OUT} y1={props.center} x2={props.center - props.size * CONST.AC_IN} y2={props.center} stroke='#FFD700' stroke-width={props.size * CONST.W_THICK} stroke-linecap='round' />
    <line x1={props.center + props.size * CONST.AC_IN} y1={props.center} x2={props.center + props.size * CONST.AC_OUT} y2={props.center} stroke='#FFD700' stroke-width={props.size * CONST.W_THICK} stroke-linecap='round' />
    <path d={`M ${props.center - props.size * CONST.AC_ARC} ${props.center} A ${props.size * CONST.AC_ARC} ${props.size * CONST.AC_ARC} 0 0 0 ${props.center + props.size * CONST.AC_ARC} ${props.center}`} fill='none' stroke='#FFD700' stroke-width={props.size * CONST.W_THICK} stroke-linecap='round' />
    <line x1={props.center} y1={props.center + props.size * CONST.AC_T1} x2={props.center} y2={props.center + props.size * CONST.AC_T2} stroke='#FFD700' stroke-width={props.size * CONST.W_THICK} stroke-linecap='round' />
    <circle cx={props.center} cy={props.center} r={props.size * CONST.AC_RAD} fill='#FFD700' />
  </g>
);

const TextOverlays: Component<SubProps & { pitch: number; roll: number; yaw: number; desiredYaw: number }> = (props) => (
  <>
    <text x={props.size * CONST.TX_L} y={props.size * CONST.TY_T} fill='white' font-size={getTextSize(props.size, CONST.T_LARGE)} text-anchor='start' font-family='monospace' font-variant-numeric='tabular-nums'>
      ΔYaw: {getDeltaYaw(props.desiredYaw, props.yaw).toFixed(CONST.DEC)}°
    </text>
    <text x={props.size * CONST.TX_L} y={props.size - props.size * CONST.TY_B} fill='white' font-size={getTextSize(props.size, CONST.T_LARGE)} text-anchor='start' font-family='monospace' font-variant-numeric='tabular-nums'>
      Pitch: {props.pitch.toFixed(CONST.DEC)}°
    </text>
    <text x={props.size * CONST.TX_R} y={props.size - props.size * CONST.TY_B} fill='white' font-size={getTextSize(props.size, CONST.T_LARGE)} text-anchor='start' font-family='monospace' font-variant-numeric='tabular-nums'>
      Roll: {props.roll.toFixed(CONST.DEC)}°
    </text>
  </>
);

const ClassicAttitudeIndicator: Component<ClassicAttitudeIndicatorProps> = (props) => {
  const center = (): number => getCenter(props.size);
  const radius = (): number => getRadius(props.size);
  const clipId = (): string => `instrument-face-${createUniqueId()}`;

  return (
    <div class='bg-background/50 backdrop-blur-sm border border-border/50 rounded-2xl opacity-75 text-foreground flex flex-col items-center justify-center overflow-hidden' style={{ width: `${props.size}px`, height: `${props.size}px`, ...props.style }}>
      <svg width={props.size} height={props.size} viewBox={`0 0 ${props.size} ${props.size}`}>
        <defs>
          <clipPath id={clipId()}>
            <circle cx={center()} cy={center()} r={radius()} />
          </clipPath>
        </defs>
        <circle cx={center()} cy={center()} r={radius()} fill='transparent' stroke='currentColor' stroke-opacity={CONST.OPACITY} stroke-width={props.size * CONST.W_NORM} />
        <g clip-path={`url(#${clipId()})`}>
          <PitchLadder size={props.size} center={center()} pitch={props.pitch} roll={props.roll} />
        </g>
        <RollIndicator size={props.size} center={center()} roll={props.roll} />
        <AircraftSymbol size={props.size} center={center()} />
        <TextOverlays size={props.size} center={center()} pitch={props.pitch} roll={props.roll} yaw={props.yaw} desiredYaw={props.desiredYaw} />
      </svg>
    </div>
  );
};

export { ClassicAttitudeIndicator };
