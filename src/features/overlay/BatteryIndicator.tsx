import type { Component, JSXElement } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import BatteryEmptyIcon from '~icons/material-symbols/battery-0-bar';
import BatteryLowIcon from '~icons/material-symbols/battery-2-bar';
import BatteryMediumIcon from '~icons/material-symbols/battery-5-bar';
import BatteryFullIcon from '~icons/material-symbols/battery-full';

import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

const BASE_WIDTH_REM = 4.75;
const SCALE_MULTIPLIER = 0.25;

const BATTERY_HIGH_THRESHOLD = 70;
const BATTERY_MEDIUM_THRESHOLD = 40;
const BATTERY_LOW_THRESHOLD = 10;

const getBatteryIcon = (percentage: number): JSXElement => {
  if (percentage > BATTERY_HIGH_THRESHOLD) {
    return <BatteryFullIcon class='size-5 mr-1' />;
  }

  if (percentage > BATTERY_MEDIUM_THRESHOLD) {
    return <BatteryMediumIcon class='size-5 mr-1' />;
  }

  if (percentage > BATTERY_LOW_THRESHOLD) {
    return <BatteryLowIcon class='size-5 mr-1' />;
  }

  return <BatteryEmptyIcon class='size-5 mr-1' />;
};

const BatteryIndicator: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_WIDTH_REM + (configStore.overlayScale - 1) * SCALE_MULTIPLIER}rem`,
  );

  return (
    <div class={connectionStatusStore.isConnected ? 'block' : 'hidden'}>
      <Badge
        variant={
          rovStatusStore.batteryPercentage < BATTERY_LOW_THRESHOLD ? 'destructive' : 'secondary'
        }
        class='bg-background/50 backdrop-blur-sm border-border/50 justify-between tabular-nums font-mono whitespace-nowrap'
        style={{ width: badgeWidth() }}
      >
        {getBatteryIcon(rovStatusStore.batteryPercentage)}
        {rovStatusStore.batteryPercentage.toFixed(0)}%
      </Badge>
    </div>
  );
};

export { BatteryIndicator };
