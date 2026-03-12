import { Badge } from '@manafishrov/ui/badge';
import { type Component, createMemo } from 'solid-js';
import ThermometerIcon from '~icons/material-symbols/device-thermostat';
import CircuitIcon from '~icons/material-symbols/memory';
import WaterIcon from '~icons/material-symbols/water-drop';

import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const TemperatureIndicator: Component = () => {
  const badgeWidth = createMemo(() => `${7 + (configStore.overlayScale - 1) * 0.5}rem`);

  return (
    <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
      <Badge
        variant='secondary'
        class='bg-background/50 backdrop-blur-sm border-border/50 items-center justify-between gap-3 whitespace-nowrap'
        style={{ width: badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <div class='relative flex items-center mr-1'>
            <ThermometerIcon class='size-4 -ml-1' />
            <WaterIcon class='size-3 -ml-1' />
          </div>
          <span class='text-[10px] uppercase tracking-wider'>Ext</span>
        </div>
        <span class='shrink-0 tabular-nums font-mono'>
          {rovTelemetryStore.waterTemperature.toFixed(1)}°C
        </span>
      </Badge>
      <Badge
        variant='secondary'
        class='bg-background/50 backdrop-blur-sm border-border/50 items-center justify-between gap-3 whitespace-nowrap'
        style={{ width: badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <div class='relative flex items-center mr-1'>
            <ThermometerIcon class='size-4 -ml-1' />
            <CircuitIcon class='size-3 -ml-1' />
          </div>
          <span class='text-[10px] uppercase tracking-wider'>Int</span>
        </div>
        <span class='shrink-0 tabular-nums font-mono'>
          {rovTelemetryStore.electronicsTemperature.toFixed(1)}°C
        </span>
      </Badge>
    </div>
  );
};

export { TemperatureIndicator };
