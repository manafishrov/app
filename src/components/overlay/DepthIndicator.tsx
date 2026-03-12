import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import RulerIcon from '~icons/material-symbols/straighten';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const DepthIndicator: Component = () => (
  <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
    <Badge variant="secondary" class="bg-background/50 backdrop-blur-sm border-border/50 justify-between w-28">
      <div class="flex items-center text-muted-foreground">
        <RulerIcon class="size-4 mr-1 rotate-90" />
        <span class="text-[10px] uppercase tracking-wider">Cur</span>
      </div>
      <span class="tabular-nums font-mono">{rovTelemetryStore.depth.toFixed(1)}m</span>
    </Badge>
    <Badge variant="secondary" class="bg-background/50 backdrop-blur-sm border-border/50 justify-between w-28">
      <div class="flex items-center text-muted-foreground">
        <RulerIcon class="size-4 mr-1 rotate-90 opacity-50" />
        <span class="text-[10px] uppercase tracking-wider">Tgt</span>
      </div>
      <span class="tabular-nums font-mono text-muted-foreground">{rovTelemetryStore.desiredDepth.toFixed(1)}m</span>
    </Badge>
  </div>
);

export { DepthIndicator };
