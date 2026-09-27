import type { Component, JSXElement } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import BatteryEmptyIcon from '~icons/material-symbols/battery-0-bar';
import BatteryLowIcon from '~icons/material-symbols/battery-2-bar';
import BatteryMediumIcon from '~icons/material-symbols/battery-5-bar';
import BatteryFullIcon from '~icons/material-symbols/battery-full';
import BoltIcon from '~icons/material-symbols/bolt';

import { rovStatusStore } from '@/stores/rovStatus';

import { formatCurrentDraw } from './currentDraw';
import { useOverlayContentVisible } from './OverlayPreview';

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

const BatteryIndicator: Component<{ current: boolean }> = (props) => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'overlay-surface overlay-readings' : 'hidden'}>
      <Show when={props.current}>
        <Badge variant='secondary' class='overlay-reading'>
          <span class='mr-1 inline-flex size-[1.2em] shrink-0 items-center justify-center'>
            <BoltIcon class='size-full' />
          </span>
          <span class='overlay-value'>{formatCurrentDraw(rovStatusStore.currentDraw)}</span>
        </Badge>
      </Show>
      <Show when={!props.current}>
        <Badge
          data-critical={rovStatusStore.batteryPercentage <= BATTERY_LOW_THRESHOLD}
          variant={
            rovStatusStore.batteryPercentage <= BATTERY_LOW_THRESHOLD ? 'destructive' : 'secondary'
          }
          class='overlay-reading'
        >
          {getBatteryIcon(rovStatusStore.batteryPercentage)}
          <span class='overlay-value'>{rovStatusStore.batteryPercentage.toFixed(0)}%</span>
        </Badge>
      </Show>
    </div>
  );
};

export { BatteryIndicator };
