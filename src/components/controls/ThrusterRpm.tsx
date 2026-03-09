import type { Component } from 'solid-js';

import { cn } from '@manafishrov/ui';
import ModeFan2Icon from '~icons/material-symbols/mode-fan';

const ThrusterRpm: Component<{ rpm: number }> = ({ rpm }) => {
  return (
    <>
      {Math.round(rpm)}
      <ModeFan2Icon
        class={cn('size-5', rpm > 0 && 'animate-spin')}
        style={{
          'animation-duration': `${rpm > 0 ? 60_000 / (rpm / 30) : 0}ms`,
        }}
      />
    </>
  );
};

export { ThrusterRpm };
