import type { Component } from 'solid-js';

import { PropellerIcon } from '@/components/icons/PropellerIcon';

const ThrusterRpm: Component<{ rpm: number }> = ({ rpm }) => {
  return (
    <>
      {Math.round(rpm)}
      <PropellerIcon
        class={rpm > 0 ? 'size-5 animate-spin' : 'size-5'}
        style={{
          'animation-duration': `${rpm > 0 ? 60_000 / (rpm / 30) : 0}ms`,
        }}
      />
    </>
  );
};

export { ThrusterRpm };
