import { Badge } from '@manafishrov/ui/badge';
import { toast } from '@manafishrov/ui/toaster';
import { createEffect, onCleanup, type Component, type JSXElement } from 'solid-js';
import BatteryEmptyIcon from '~icons/material-symbols/battery-0-bar';
import BatteryLowIcon from '~icons/material-symbols/battery-2-bar';
import BatteryMediumIcon from '~icons/material-symbols/battery-5-bar';
import BatteryFullIcon from '~icons/material-symbols/battery-full';
import BoltIcon from '~icons/material-symbols/bolt';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

const BATTERY_HIGH_THRESHOLD = 70;
const BATTERY_MEDIUM_THRESHOLD = 40;
const BATTERY_LOW_THRESHOLD = 10;
const BATTERY_WARNING_RESET_THRESHOLD = 15;
const BATTERY_WARNING_DELAY_MS = 3000;

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

const useLowBatteryWarning = (): void => {
  let warningShown = false;
  let warningTimer: ReturnType<typeof setTimeout> | null = null;

  const cancelPendingWarning = (): void => {
    if (warningTimer !== null) {
      clearTimeout(warningTimer);
      warningTimer = null;
    }
  };

  onCleanup(cancelPendingWarning);

  createEffect(() => {
    const connected = connectionStatusStore.isConnected;
    const telemetryAvailable = rovStatusStore.health.mcuHealthy;
    const percentage = rovStatusStore.batteryPercentage;
    if (!connected || !telemetryAvailable || percentage > BATTERY_LOW_THRESHOLD) {
      cancelPendingWarning();
      if (!connected || !telemetryAvailable || percentage > BATTERY_WARNING_RESET_THRESHOLD) {
        warningShown = false;
      }
    } else if (percentage <= BATTERY_LOW_THRESHOLD && !warningShown && warningTimer === null) {
      warningTimer = setTimeout(() => {
        warningTimer = null;
        if (
          connectionStatusStore.isConnected &&
          rovStatusStore.health.mcuHealthy &&
          rovStatusStore.batteryPercentage <= BATTERY_LOW_THRESHOLD
        ) {
          warningShown = true;
          toast.create({
            title: m.toasts_low_battery_title(),
            description: m.toasts_low_battery_description(),
            type: 'error',
          });
        }
      }, BATTERY_WARNING_DELAY_MS);
    }
  });
};

const BatteryIndicator: Component = () => {
  useLowBatteryWarning();

  return (
    <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
      <Badge
        variant='secondary'
        class='h-auto min-h-5 min-w-[4rem] justify-between border-border/50 bg-background/50 py-1 font-mono whitespace-nowrap tabular-nums backdrop-blur-sm'
      >
        <span class='mr-1 inline-flex size-[1.2em] shrink-0 items-center justify-center'>
          <BoltIcon class='size-full' />
        </span>
        {rovStatusStore.currentDraw.toFixed(0)}A
      </Badge>
      <Badge
        variant={
          rovStatusStore.batteryPercentage <= BATTERY_LOW_THRESHOLD ? 'destructive' : 'secondary'
        }
        class='h-auto min-h-5 min-w-[4rem] justify-between border-border/50 bg-background/50 py-1 font-mono whitespace-nowrap tabular-nums backdrop-blur-sm'
      >
        {getBatteryIcon(rovStatusStore.batteryPercentage)}
        {rovStatusStore.batteryPercentage.toFixed(0)}%
      </Badge>
    </div>
  );
};

export { BatteryIndicator };
