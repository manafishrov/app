import { useGLTF } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { Suspense, useRef } from 'react';
import type { Group } from 'three';

const MOVE_SMOOTHING_FACTOR = 0.015;
const RETURN_SMOOTHING_FACTOR = 0.01;

type Dimensional3DAttitudeIndicatorProps = {
  size: number;
  pitch: number;
  roll: number;
  rawYawInput: number;
};

function Model({
  pitch,
  roll,
  rawYawInput,
}: {
  pitch: number;
  roll: number;
  rawYawInput: number;
}) {
  const groupRef = useRef<Group>(null!);
  const { scene } = useGLTF('/base.glb');

  const visualYawRef = useRef(0);

  useFrame((_, deltaTime) => {
    const dt = Math.min(deltaTime, 0.1);
    const goalYaw = rawYawInput * 90;
    const isReturningToCenter = rawYawInput === 0;
    const smoothingFactor = isReturningToCenter
      ? RETURN_SMOOTHING_FACTOR
      : MOVE_SMOOTHING_FACTOR;
    const diff = goalYaw - visualYawRef.current;

    visualYawRef.current += diff * smoothingFactor * (dt * 60);

    if (Math.abs(diff) < 0.01) {
      visualYawRef.current = goalYaw;
    }

    if (groupRef.current) {
      groupRef.current.rotation.x = (pitch * Math.PI) / 180;
      groupRef.current.rotation.z = (roll * Math.PI) / 180;
      groupRef.current.rotation.y = (visualYawRef.current * Math.PI) / 180;
    }
  });

  return <primitive object={scene.clone()} ref={groupRef} />;
}

function Dimensional3DAttitudeIndicator({
  size,
  pitch,
  roll,
  rawYawInput,
}: Dimensional3DAttitudeIndicatorProps) {
  return (
    <div
      className='bg-muted relative rounded-2xl opacity-75'
      style={{ width: size, height: size }}
    >
      <Canvas camera={{ position: [0, 0, 2.2] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Model pitch={pitch} roll={roll} rawYawInput={rawYawInput} />
        </Suspense>
      </Canvas>
      <svg
        width={size}
        height={size}
        viewBox={`-${size * 0.05} -${size * 0.05} ${size * 1.1} ${size * 1.1}`}
        className='absolute top-0 left-0'
      >
        <text
          x={size * 0.1}
          y={size - size * 0.05}
          fill='oklch(0.985 0 0)'
          fontSize={size * 0.06}
        >
          Pitch: {pitch.toFixed(1)}°
        </text>
        <text
          x={size - size * 0.4}
          y={size - size * 0.05}
          fill='oklch(0.985 0 0)'
          fontSize={size * 0.06}
        >
          Roll: {roll.toFixed(1)}°
        </text>
      </svg>
    </div>
  );
}

export { Dimensional3DAttitudeIndicator };
