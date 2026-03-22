import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import ThermometerIcon from '~icons/material-symbols/device-thermostat';
import CircuitIcon from '~icons/material-symbols/memory';
import WaterIcon from '~icons/material-symbols/water-drop';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const BASE_BADGE_WIDTH_REM = 7;
const BADGE_WIDTH_SCALE_FACTOR = 2;

const TemperatureIndicator: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_BADGE_WIDTH_REM + (configStore.overlayScale - 1) * BADGE_WIDTH_SCALE_FACTOR}rem`,
  );

  return (
    <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
      <Badge
        variant='secondary'
        class='h-auto min-h-5 items-center justify-between gap-3 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
        style={{ 'min-width': badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <div class='relative mr-1 flex items-center'>
            <ThermometerIcon class='-ml-1 size-[1em]' />
            <WaterIcon class='-ml-1 size-[0.8em]' />
          </div>
          <span class='text-[10px] tracking-wider uppercase'>
            {m.overlay_temperature_external_short()}
          </span>
        </div>
        <span class='shrink-0 font-mono tabular-nums'>
          {rovTelemetryStore.waterTemperature.toFixed(1)}°C
        </span>
      </Badge>
      <Badge
        variant='secondary'
        class='h-auto min-h-5 items-center justify-between gap-3 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
        style={{ 'min-width': badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <div class='relative mr-1 flex items-center'>
            <ThermometerIcon class='-ml-1 size-[1em]' />
            <CircuitIcon class='-ml-1 size-[0.8em]' />
          </div>
          <span class='text-[10px] tracking-wider uppercase'>
            {m.overlay_temperature_internal_short()}
          </span>
        </div>
        <span class='shrink-0 font-mono tabular-nums'>
          {rovTelemetryStore.electronicsTemperature.toFixed(1)}°C
        </span>
      </Badge>
    </div>
  );
};

export { TemperatureIndicator };
