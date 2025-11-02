import { FanIcon } from 'lucide-react';

function ThrusterRpm({ rpm }: { rpm: number }) {
  return (
    <>
      {Math.round(rpm)}
      <FanIcon
        className={rpm > 0 ? 'animate-spin' : ''}
        style={{
          animationDuration: `${rpm > 0 ? 60_000 / (rpm / 30) : 0}ms`,
        }}
      />
    </>
  );
}

export { ThrusterRpm };
