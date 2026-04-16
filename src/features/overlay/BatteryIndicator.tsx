import type { Component, JSXElement } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import BatteryEmptyIcon from '~icons/material-symbols/battery-0-bar';
import BatteryLowIcon from '~icons/material-symbols/battery-2-bar';
import BatteryMediumIcon from '~icons/material-symbols/battery-5-bar';
import BatteryFullIcon from '~icons/material-symbols/battery-full';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

const BATTERY_HIGH_THRESHOLD = 70;
const BATTERY_MEDIUM_THRESHOLD = 40;
const BATTERY_LOW_THRESHOLD = 10;

const BatteryIconWrapper: Component<{ children: JSXElement }> = (props) => (
  <span class='mr-1 inline-flex size-[1.2em] shrink-0 items-center justify-center'>
    {props.children}
  </span>
);

const getBatteryIcon = (percentage: number): JSXElement => {
  if (percentage > BATTERY_HIGH_THRESHOLD) {
    return (
      <BatteryIconWrapper>
        <BatteryFullIcon class='size-full' />
      </BatteryIconWrapper>
    );
  }

  if (percentage > BATTERY_MEDIUM_THRESHOLD) {
    return (
      <BatteryIconWrapper>
        <BatteryMediumIcon class='size-full' />
      </BatteryIconWrapper>
    );
  }

  if (percentage > BATTERY_LOW_THRESHOLD) {
    return (
      <BatteryIconWrapper>
        <BatteryLowIcon class='size-full' />
      </BatteryIconWrapper>
    );
  }

  return (
    <BatteryIconWrapper>
      <BatteryEmptyIcon class='size-full' />
    </BatteryIconWrapper>
  );
};

const BatteryIndicator: Component = () => (
  <div class={connectionStatusStore.isConnected ? 'flex' : 'hidden'}>
    <Badge
      variant={
        rovStatusStore.batteryPercentage < BATTERY_LOW_THRESHOLD ? 'destructive' : 'secondary'
      }
      class='h-auto min-h-5 min-w-[4rem] justify-between border-border/50 bg-background/50 py-1 font-mono whitespace-nowrap tabular-nums backdrop-blur-sm'
    >
      {getBatteryIcon(rovStatusStore.batteryPercentage)}
      {rovStatusStore.batteryPercentage.toFixed(0)}%
    </Badge>
  </div>
);

export { BatteryIndicator };
