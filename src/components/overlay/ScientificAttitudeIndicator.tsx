import { memo } from 'react';

type ScientificAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  desiredPitch: number;
  desiredRoll: number;
  style?: React.CSSProperties;
};

const ScientificAttitudeIndicator = memo(function ScientificAttitudeIndicator({
  size,
  pitch,
  roll,
  desiredPitch,
  desiredRoll,
  style,
}: ScientificAttitudeIndicatorProps) {
  const center = size / 2;
  const pitchScale = size / 200;

  return (
    <div
      className='bg-muted relative rounded-2xl opacity-75'
      style={{ width: size, height: size, ...style }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`-${size * 0.05} -${size * 0.05} ${size * 1.1} ${size * 1.1}`}
      >
        <circle
          cx={center}
          cy={center}
          r={center - size * 0.05}
          fill='transparent'
          stroke='oklch(1 0 0 / 10%)'
          strokeWidth={size * 0.01}
        />

        {[-90, -60, -30, -15, 0, 15, 30, 60, 90].map((deg) => (
          <g key={deg}>
            <line
              x1={center - size * 0.4}
              y1={center + deg * pitchScale}
              x2={center + size * 0.4}
              y2={center + deg * pitchScale}
              stroke='oklch(0.985 0 0)'
              strokeWidth={size * 0.005}
              strokeOpacity='0.5'
            />
            <text
              x={center - size * 0.4 - size * 0.025}
              y={center + deg * pitchScale + size * 0.025}
              fill='oklch(0.985 0 0)'
              fontSize={size * 0.05}
              textAnchor='end'
            >
              {deg}°
            </text>
            <text
              x={center + size * 0.4 + size * 0.025}
              y={center + deg * pitchScale + size * 0.025}
              fill='oklch(0.985 0 0)'
              fontSize={size * 0.05}
              textAnchor='start'
            >
              {deg}°
            </text>
          </g>
        ))}

        {[-180, -135, -90, -45, 0, 45, 90, 135, 180].map((deg) => (
          <g key={deg} transform={`rotate(${deg} ${center} ${center})`}>
            <line
              x1={center}
              y1={size * 0.075}
              x2={center}
              y2={size * 0.125}
              stroke='oklch(0.985 0 0)'
              strokeWidth={size * 0.01}
            />
            {(deg <= -90 || (deg >= -45 && deg <= 90) || deg >= 135) && (
              <text
                x={center}
                y={size * 0.17}
                fill='oklch(0.985 0 0)'
                fontSize={size * 0.06}
                textAnchor='middle'
                alignmentBaseline='middle'
                transform={`
                  rotate(${-deg} ${center} ${size * 0.17})
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
        ))}

        <g
          style={{
            transform: `
              translate(${center}px, ${center}px)
              translateY(${-desiredPitch * pitchScale}px)
              rotate(${desiredRoll}deg)
              translate(${-center}px, ${-center}px)
            `,
          }}
        >
          <line
            x1={center - size * 0.25}
            y1={center}
            x2={center + size * 0.25}
            y2={center}
            stroke='#ffff00'
            strokeWidth={size * 0.01}
            strokeDasharray={`${size * 0.02} ${size * 0.02}`}
          />
          <path
            d={`M ${-size * 0.02},${-size * 0.02} L 0,${-size * 0.04} L ${size * 0.02},${-size * 0.02}`}
            fill='#ffff00'
            transform={`translate(${center} ${center})`}
          />
        </g>

        <g
          style={{
            transform: `
              translate(${center}px, ${center}px)
              translateY(${-pitch * pitchScale}px)
              rotate(${roll}deg)
              translate(${-center}px, ${-center}px)
            `,
          }}
        >
          <line
            x1={center - size * 0.25}
            y1={center}
            x2={center - size * 0.075}
            y2={center}
            stroke='#00ff00'
            strokeWidth={size * 0.01}
          />
          <line
            x1={center + size * 0.075}
            y1={center}
            x2={center + size * 0.25}
            y2={center}
            stroke='#00ff00'
            strokeWidth={size * 0.01}
          />
          <circle cx={center} cy={center} r={size * 0.02} fill='#00ff00' />
          <path
            d={`M ${-size * 0.02},${-size * 0.02} L 0,${-size * 0.04} L ${size * 0.02},${-size * 0.02}`}
            fill='#00ff00'
            transform={`translate(${center} ${center})`}
          />
        </g>

        <text
          x={size * 0.1}
          y={size - size * 0.1}
          fill='oklch(0.985 0 0)'
          fontSize={size * 0.06}
        >
          Pitch: {pitch.toFixed(1)}°
        </text>
        <text
          x={size - size * 0.4}
          y={size - size * 0.1}
          fill='oklch(0.985 0 0)'
          fontSize={size * 0.06}
        >
          Roll: {roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
});

export { ScientificAttitudeIndicator };
