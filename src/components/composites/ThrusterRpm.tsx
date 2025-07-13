import { FanIcon } from 'lucide-react';

const THRUSTER_POLE_PAIRS = 6;

function ThrusterRpm({ erpm }: { erpm: number }) {
  return (
    <>
      <FanIcon
        className={erpm > 0 ? 'animate-spin' : ''}
        style={{
          animationDuration: `${
            erpm > 0 ? 60_000 / (erpm / THRUSTER_POLE_PAIRS / 60) : 0
          }ms`,
        }}
      />
      {Math.round(erpm / THRUSTER_POLE_PAIRS)}
    </>
  );
}

export { ThrusterRpm };
