import { FanIcon } from 'lucide-react';

function ThrusterRpm({ rpm }: { rpm: number }) {
  return (
    <>
      <FanIcon
        className={rpm > 0 ? 'animate-spin' : ''}
        style={{
          animationDuration: `${rpm > 0 ? 60_000 / (rpm / 60) : 0}ms`,
        }}
      />
      {Math.round(rpm)}
    </>
  );
}

export { ThrusterRpm };
