import type { Component, JSX } from 'solid-js';

import { PropellerIcon } from '@/components/icons/PropellerIcon';

const MS_PER_MINUTE = 60_000;
const RPM_DIVISOR = 30;

const ThrusterRpm: Component<{ rpm: number }> = ({ rpm }): JSX.Element => (
  <>
    {Math.round(rpm)}
    <PropellerIcon
      class={rpm > 0 ? 'size-5 animate-spin' : 'size-5'}
      style={{
        'animation-duration': `${rpm > 0 ? MS_PER_MINUTE / (rpm / RPM_DIVISOR) : 0}ms`,
      }}
    />
  </>
);

export { ThrusterRpm };
