import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import ThermometerIcon from '~icons/material-symbols/device-thermostat';
import WaterIcon from '~icons/material-symbols/water-drop';
import CircuitIcon from '~icons/material-symbols/memory';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const TemperatureIndicator: Component = () => (
  <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
    <Badge variant="secondary" class="bg-background/50 backdrop-blur-sm border-border/50 justify-between w-28">
      <div class="flex items-center text-muted-foreground">
        <div class="relative flex items-center mr-1">
          <ThermometerIcon class="size-4 -ml-1" />
          <WaterIcon class="size-3 -ml-1" />
        </div>
        <span class="text-[10px] uppercase tracking-wider">Ext</span>
      </div>
      <span class="tabular-nums font-mono">{rovTelemetryStore.waterTemperature.toFixed(1)}°C</span>
    </Badge>
    <Badge variant="secondary" class="bg-background/50 backdrop-blur-sm border-border/50 justify-between w-28">
      <div class="flex items-center text-muted-foreground">
        <div class="relative flex items-center mr-1">
          <ThermometerIcon class="size-4 -ml-1" />
          <CircuitIcon class="size-3 -ml-1" />
        </div>
        <span class="text-[10px] uppercase tracking-wider">Int</span>
      </div>
      <span class="tabular-nums font-mono">{rovTelemetryStore.electronicsTemperature.toFixed(1)}°C</span>
    </Badge>
  </div>
);

export { TemperatureIndicator };
