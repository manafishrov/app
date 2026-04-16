import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import RulerIcon from '~icons/material-symbols/straighten';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { DesiredDepthPopover } from './DesiredDepthPopover';

const DepthIndicator: Component = () => (
  <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
    <Badge
      variant='secondary'
      class='h-auto min-h-5 min-w-[7rem] items-center justify-between gap-3 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
    >
      <div class='flex shrink-0 items-center text-muted-foreground'>
        <RulerIcon class='mr-1 size-[1em] rotate-90' />
        <span class='text-[10px] tracking-wider uppercase'>{m.overlay_depth_current_short()}</span>
      </div>
      <span class='shrink-0 font-mono tabular-nums'>{rovTelemetryStore.depth.toFixed(1)}m</span>
    </Badge>
    <DesiredDepthPopover>
      <Badge
        variant='secondary'
        class='h-auto min-h-5 min-w-[7rem] items-center justify-between gap-3 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm transition-colors hover:bg-background/80'
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <RulerIcon class='mr-1 size-[1em] rotate-90 opacity-50' />
          <span class='text-[10px] tracking-wider uppercase'>{m.overlay_depth_target_short()}</span>
        </div>
        <span class='shrink-0 font-mono text-muted-foreground tabular-nums'>
          {rovTelemetryStore.desiredDepth.toFixed(1)}m
        </span>
      </Badge>
    </DesiredDepthPopover>
  </div>
);

export { DepthIndicator };
