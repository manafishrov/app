import type { Component } from 'solid-js';

import {
  ACTUAL_CIRCLE_RADIUS,
  ACTUAL_LINE_OFFSET_1,
  ACTUAL_LINE_OFFSET_2,
  ACTUAL_LINE_STROKE_WIDTH,
  ACTUAL_PATH_OFFSET_1,
  ACTUAL_PATH_OFFSET_2,
  DEG_135,
  DEG_90,
  DEG_NEG_45,
  DEG_NEG_90,
  DESIRED_LINE_DASH,
  DESIRED_LINE_OFFSET,
  DESIRED_LINE_STROKE_WIDTH,
  DESIRED_PATH_OFFSET_1,
  DESIRED_PATH_OFFSET_2,
  getScientificCenter,
  getScientificDegreeLabel,
  getScientificPitchScale,
  getScientificTextSize,
  getScientificTranslateY,
  getScientificYawScale,
  INFO_TEXT_SIZE,
  INFO_TEXT_X1,
  INFO_TEXT_X2,
  INFO_TEXT_Y1,
  INFO_TEXT_Y2,
  PITCH_LINES,
  PITCH_LINE_OFFSET,
  PITCH_LINE_STROKE_WIDTH,
  PITCH_TEXT_OFFSET_X,
  PITCH_TEXT_OFFSET_Y,
  PITCH_TEXT_SIZE,
  YAW_LINES,
  YAW_LINE_STROKE_WIDTH,
  YAW_LINE_Y1,
  YAW_LINE_Y2,
  YAW_TEXT_SIZE,
  YAW_TEXT_Y,
} from './constants';

type SizeProps = {
  size: number;
};

type DesiredIndicatorProps = SizeProps & {
  desiredPitch: number;
  desiredRoll: number;
  deltaYaw: number;
};

type ActualIndicatorProps = SizeProps & {
  pitch: number;
  roll: number;
  deltaYaw: number;
};

type InfoTextsProps = SizeProps & {
  pitch: number;
  roll: number;
  deltaYaw: number;
};

export const PitchLines: Component<SizeProps> = (props) => {
  const center = (): number => getScientificCenter(props.size);
  const pitchScale = (): number => getScientificPitchScale(props.size);
  const textSize = (ratio: number): string => getScientificTextSize(props.size, ratio);

  return (
    <For each={PITCH_LINES}>
      {(deg) => (
        <g>
          <line
            x1={center() - props.size * PITCH_LINE_OFFSET}
            y1={center() + deg * pitchScale()}
            x2={center() + props.size * PITCH_LINE_OFFSET}
            y2={center() + deg * pitchScale()}
            stroke='currentColor'
            stroke-width={props.size * PITCH_LINE_STROKE_WIDTH}
            stroke-opacity='0.5'
          />
          <text
            x={center() - props.size * PITCH_LINE_OFFSET - props.size * PITCH_TEXT_OFFSET_X}
            y={center() + deg * pitchScale() + props.size * PITCH_TEXT_OFFSET_Y}
            fill='currentColor'
            font-size={textSize(PITCH_TEXT_SIZE)}
            text-anchor='end'
          >
            {deg}°
          </text>
          <text
            x={center() + props.size * PITCH_LINE_OFFSET + props.size * PITCH_TEXT_OFFSET_X}
            y={center() + deg * pitchScale() + props.size * PITCH_TEXT_OFFSET_Y}
            fill='currentColor'
            font-size={textSize(PITCH_TEXT_SIZE)}
            text-anchor='start'
          >
            {deg}°
          </text>
        </g>
      )}
    </For>
  );
};

export const YawLines: Component<SizeProps> = (props) => {
  const center = (): number => getScientificCenter(props.size);
  const textSize = (ratio: number): string => getScientificTextSize(props.size, ratio);

  return (
    <For each={YAW_LINES}>
      {(deg) => (
        <g transform={`rotate(${deg} ${center()} ${center()})`}>
          <line
            x1={center()}
            y1={props.size * YAW_LINE_Y1}
            x2={center()}
            y2={props.size * YAW_LINE_Y2}
            stroke='currentColor'
            stroke-width={props.size * YAW_LINE_STROKE_WIDTH}
          />
          {(deg <= DEG_NEG_90 || (deg >= DEG_NEG_45 && deg <= DEG_90) || deg >= DEG_135) && (
            <text
              x={center()}
              y={props.size * YAW_TEXT_Y}
              fill='currentColor'
              font-size={textSize(YAW_TEXT_SIZE)}
              text-anchor='middle'
              alignment-baseline='middle'
              transform={`
                rotate(${-deg} ${center()} ${props.size * YAW_TEXT_Y})
                translate(0 ${getScientificTranslateY(deg)})
              `}
            >
              {getScientificDegreeLabel(deg)}°
            </text>
          )}
        </g>
      )}
    </For>
  );
};

export const DesiredIndicator: Component<DesiredIndicatorProps> = (props) => {
  const center = (): number => getScientificCenter(props.size);
  const pitchScale = (): number => getScientificPitchScale(props.size);
  const yawScale = (): number => getScientificYawScale(props.size);

  return (
    <g
      style={{
        transform: `
          translate(${center()}px, ${center()}px)
          translateX(${props.deltaYaw * yawScale()}px)
          translateY(${-props.desiredPitch * pitchScale()}px)
          rotate(${props.desiredRoll}deg)
          translate(${-center()}px, ${-center()}px)
        `,
      }}
    >
      <line
        x1={center() - props.size * DESIRED_LINE_OFFSET}
        y1={center()}
        x2={center() + props.size * DESIRED_LINE_OFFSET}
        y2={center()}
        stroke='#ffff00'
        stroke-width={props.size * DESIRED_LINE_STROKE_WIDTH}
        stroke-dasharray={`${props.size * DESIRED_LINE_DASH} ${props.size * DESIRED_LINE_DASH}`}
      />
      <path
        d={`M ${-props.size * DESIRED_PATH_OFFSET_1},${-props.size * DESIRED_PATH_OFFSET_1} L 0,${-props.size * DESIRED_PATH_OFFSET_2} L ${props.size * DESIRED_PATH_OFFSET_1},${-props.size * DESIRED_PATH_OFFSET_1}`}
        fill='#ffff00'
        transform={`translate(${center()} ${center()})`}
      />
    </g>
  );
};

export const ActualIndicator: Component<ActualIndicatorProps> = (props) => {
  const center = (): number => getScientificCenter(props.size);
  const pitchScale = (): number => getScientificPitchScale(props.size);
  const yawScale = (): number => getScientificYawScale(props.size);

  return (
    <g
      style={{
        transform: `
          translate(${center()}px, ${center()}px)
          translateX(${props.deltaYaw * yawScale()}px)
          translateY(${-props.pitch * pitchScale()}px)
          rotate(${props.roll}deg)
          translate(${-center()}px, ${-center()}px)
        `,
      }}
    >
      <line
        x1={center() - props.size * ACTUAL_LINE_OFFSET_1}
        y1={center()}
        x2={center() - props.size * ACTUAL_LINE_OFFSET_2}
        y2={center()}
        stroke='#00ff00'
        stroke-width={props.size * ACTUAL_LINE_STROKE_WIDTH}
      />
      <line
        x1={center() + props.size * ACTUAL_LINE_OFFSET_2}
        y1={center()}
        x2={center() + props.size * ACTUAL_LINE_OFFSET_1}
        y2={center()}
        stroke='#00ff00'
        stroke-width={props.size * ACTUAL_LINE_STROKE_WIDTH}
      />
      <circle cx={center()} cy={center()} r={props.size * ACTUAL_CIRCLE_RADIUS} fill='#00ff00' />
      <path
        d={`M ${-props.size * ACTUAL_PATH_OFFSET_1},${-props.size * ACTUAL_PATH_OFFSET_1} L 0,${-props.size * ACTUAL_PATH_OFFSET_2} L ${props.size * ACTUAL_PATH_OFFSET_1},${-props.size * ACTUAL_PATH_OFFSET_1}`}
        fill='#00ff00'
        transform={`translate(${center()} ${center()})`}
      />
    </g>
  );
};

export const InfoTexts: Component<InfoTextsProps> = (props) => {
  const textSize = (ratio: number): string => getScientificTextSize(props.size, ratio);
  const FRACTION_DIGITS = 1;

  return (
    <>
      <text
        x={props.size * INFO_TEXT_X1}
        y={props.size * INFO_TEXT_Y1}
        fill='currentColor'
        font-size={textSize(INFO_TEXT_SIZE)}
      >
        ΔYaw: {props.deltaYaw.toFixed(FRACTION_DIGITS)}°
      </text>
      <text
        x={props.size * INFO_TEXT_X1}
        y={props.size - props.size * INFO_TEXT_Y2}
        fill='currentColor'
        font-size={textSize(INFO_TEXT_SIZE)}
      >
        Pitch: {props.pitch.toFixed(FRACTION_DIGITS)}°
      </text>
      <text
        x={props.size - props.size * INFO_TEXT_X2}
        y={props.size - props.size * INFO_TEXT_Y2}
        fill='currentColor'
        font-size={textSize(INFO_TEXT_SIZE)}
      >
        Roll: {props.roll.toFixed(FRACTION_DIGITS)}°
      </text>
    </>
  );
};
