import type { Component } from 'solid-js';

import { CONST, ROLL_TICKS, type SubProps } from './constants';
import { getArcRadius, getDeltaYaw, getPitchLines, getPitchScale, getTextSize } from './math';

const PitchLabel: Component<{
  size: number;
  center: number;
  width: number;
  posY: number;
  deg: number;
}> = (props) => (
  <>
    <text
      x={props.center - props.width / CONST.HALF - props.size * CONST.T_OFF_X}
      y={props.posY}
      fill='white'
      font-size={getTextSize(props.size, CONST.T_NORM)}
      text-anchor='end'
      alignment-baseline='middle'
    >
      {props.deg}
    </text>
    <text
      x={props.center + props.width / CONST.HALF + props.size * CONST.T_OFF_X}
      y={props.posY}
      fill='white'
      font-size={getTextSize(props.size, CONST.T_NORM)}
      text-anchor='start'
      alignment-baseline='middle'
    >
      {props.deg}
    </text>
  </>
);

const PitchLine: Component<{ size: number; center: number; deg: number }> = (props) => {
  const isLong = Math.abs(props.deg) % CONST.P_MOD === 0;
  const width = isLong ? props.size * CONST.L_LONG : props.size * CONST.L_SHORT;
  const posY = props.center - props.deg * getPitchScale(props.size);

  return (
    <g>
      <line
        x1={props.center - width / CONST.HALF}
        y1={posY}
        x2={props.center + width / CONST.HALF}
        y2={posY}
        stroke='white'
        stroke-width={props.size * CONST.W_THIN}
      />
      <Show when={isLong}>
        <PitchLabel
          size={props.size}
          center={props.center}
          width={width}
          posY={posY}
          deg={props.deg}
        />
      </Show>
    </g>
  );
};

const RollTickMark: Component<
  SubProps & { deg: number; type: (typeof ROLL_TICKS)[number]['type'] }
> = (props) => {
  const arcRadius = (): number => getArcRadius(props.size);

  return (
    <g transform={`rotate(${props.deg} ${props.center} ${props.center})`}>
      <Switch>
        <Match when={props.type === 'triangle'}>
          <polygon
            points={`${props.center},${props.center - arcRadius()} ${props.center - props.size * CONST.T_OFF_X},${props.center - arcRadius() - props.size * CONST.TICK_Y1} ${props.center + props.size * CONST.T_OFF_X},${props.center - arcRadius() - props.size * CONST.TICK_Y1}`}
            fill='white'
          />
        </Match>
        <Match when={props.type === 'long'}>
          <line
            x1={props.center}
            y1={props.center - arcRadius()}
            x2={props.center}
            y2={props.center - arcRadius() - props.size * CONST.TICK_Y1}
            stroke='white'
            stroke-width={props.size * CONST.W_NORM}
          />
        </Match>
        <Match when={props.type === 'short'}>
          <line
            x1={props.center}
            y1={props.center - arcRadius()}
            x2={props.center}
            y2={props.center - arcRadius() - props.size * CONST.TICK_Y2}
            stroke='white'
            stroke-width={props.size * CONST.W_NORM}
          />
        </Match>
      </Switch>
    </g>
  );
};

const PitchLadder: Component<SubProps & { pitch: number; roll: number }> = (props) => (
  <g transform={`rotate(${-props.roll}, ${props.center}, ${props.center})`}>
    <g transform={`translate(0, ${props.pitch * getPitchScale(props.size)})`}>
      <rect
        x={props.center - props.size * CONST.R_OFF}
        y={props.center - props.size * CONST.R_SIZE}
        width={props.size * CONST.R_SIZE}
        height={props.size * CONST.R_SIZE}
        fill='#4A90D9'
      />
      <rect
        x={props.center - props.size * CONST.R_OFF}
        y={props.center}
        width={props.size * CONST.R_SIZE}
        height={props.size * CONST.R_SIZE}
        fill='#6B4226'
      />
      <line
        x1={props.center - props.size * CONST.R_OFF}
        y1={props.center}
        x2={props.center + props.size * CONST.R_OFF}
        y2={props.center}
        stroke='white'
        stroke-width={props.size * CONST.W_NORM}
      />
      <For each={getPitchLines()}>
        {(deg) => <PitchLine size={props.size} center={props.center} deg={deg} />}
      </For>
    </g>
  </g>
);

const RollIndicator: Component<SubProps & { roll: number }> = (props) => (
  <>
    <g>
      <path
        d={`M ${props.center - getArcRadius(props.size)} ${props.center} A ${getArcRadius(props.size)} ${getArcRadius(props.size)} 0 0 1 ${props.center + getArcRadius(props.size)} ${props.center}`}
        fill='none'
        stroke='white'
        stroke-width={props.size * CONST.W_NORM}
      />
      <For each={ROLL_TICKS}>
        {(tick) => (
          <RollTickMark size={props.size} center={props.center} deg={tick.deg} type={tick.type} />
        )}
      </For>
    </g>
    <g transform={`rotate(${-props.roll} ${props.center} ${props.center})`}>
      <polygon
        points={`${props.center},${props.center - getArcRadius(props.size)} ${props.center - props.size * CONST.T_OFF_X},${props.center - getArcRadius(props.size) + props.size * CONST.PTR_Y} ${props.center + props.size * CONST.T_OFF_X},${props.center - getArcRadius(props.size) + props.size * CONST.PTR_Y}`}
        fill='white'
      />
    </g>
  </>
);

const AircraftSymbol: Component<SubProps> = (props) => (
  <g>
    <line
      x1={props.center - props.size * CONST.AC_OUT}
      y1={props.center}
      x2={props.center - props.size * CONST.AC_IN}
      y2={props.center}
      stroke='#FFD700'
      stroke-width={props.size * CONST.W_THICK}
      stroke-linecap='round'
    />
    <line
      x1={props.center + props.size * CONST.AC_IN}
      y1={props.center}
      x2={props.center + props.size * CONST.AC_OUT}
      y2={props.center}
      stroke='#FFD700'
      stroke-width={props.size * CONST.W_THICK}
      stroke-linecap='round'
    />
    <path
      d={`M ${props.center - props.size * CONST.AC_ARC} ${props.center} A ${props.size * CONST.AC_ARC} ${props.size * CONST.AC_ARC} 0 0 0 ${props.center + props.size * CONST.AC_ARC} ${props.center}`}
      fill='none'
      stroke='#FFD700'
      stroke-width={props.size * CONST.W_THICK}
      stroke-linecap='round'
    />
    <line
      x1={props.center}
      y1={props.center + props.size * CONST.AC_T1}
      x2={props.center}
      y2={props.center + props.size * CONST.AC_T2}
      stroke='#FFD700'
      stroke-width={props.size * CONST.W_THICK}
      stroke-linecap='round'
    />
    <circle cx={props.center} cy={props.center} r={props.size * CONST.AC_RAD} fill='#FFD700' />
  </g>
);

const TextOverlays: Component<
  SubProps & { pitch: number; roll: number; yaw: number; desiredYaw: number }
> = (props) => (
  <>
    <text
      x={props.size * CONST.TX_L}
      y={props.size * CONST.TY_T}
      fill='white'
      font-size={getTextSize(props.size, CONST.T_LARGE)}
      text-anchor='start'
      font-family='monospace'
      font-variant-numeric='tabular-nums'
    >
      ΔYaw: {getDeltaYaw(props.desiredYaw, props.yaw).toFixed(CONST.DEC)}°
    </text>
    <text
      x={props.size * CONST.TX_L}
      y={props.size - props.size * CONST.TY_B}
      fill='white'
      font-size={getTextSize(props.size, CONST.T_LARGE)}
      text-anchor='start'
      font-family='monospace'
      font-variant-numeric='tabular-nums'
    >
      Pitch: {props.pitch.toFixed(CONST.DEC)}°
    </text>
    <text
      x={props.size * CONST.TX_R}
      y={props.size - props.size * CONST.TY_B}
      fill='white'
      font-size={getTextSize(props.size, CONST.T_LARGE)}
      text-anchor='start'
      font-family='monospace'
      font-variant-numeric='tabular-nums'
    >
      Roll: {props.roll.toFixed(CONST.DEC)}°
    </text>
  </>
);

export { AircraftSymbol, PitchLadder, RollIndicator, TextOverlays };
