import { Badge } from '@manafishrov/ui/badge';
import { type Component, createMemo } from 'solid-js';
import RulerIcon from '~icons/material-symbols/straighten';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const BASE_WIDTH_REM = 7;
const SCALE_MULTIPLIER = 0.5;

const DepthIndicator: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_WIDTH_REM + (configStore.overlayScale - 1) * SCALE_MULTIPLIER}rem`,
  );

  return (
    <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
      <Badge
        variant='secondary'
        class='bg-background/50 backdrop-blur-sm border-border/50 items-center justify-between gap-3 whitespace-nowrap'
        style={{ width: badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <RulerIcon class='size-4 mr-1 rotate-90' />
          <span class='text-[10px] uppercase tracking-wider'>
            {m.overlay_depth_current_short()}
          </span>
        </div>
        <span class='shrink-0 tabular-nums font-mono'>{rovTelemetryStore.depth.toFixed(1)}m</span>
      </Badge>
      <Badge
        variant='secondary'
        class='bg-background/50 backdrop-blur-sm border-border/50 items-center justify-between gap-3 whitespace-nowrap'
        style={{ width: badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <RulerIcon class='size-4 mr-1 rotate-90 opacity-50' />
          <span class='text-[10px] uppercase tracking-wider'>{m.overlay_depth_target_short()}</span>
        </div>
        <span class='shrink-0 tabular-nums font-mono text-muted-foreground'>
          {rovTelemetryStore.desiredDepth.toFixed(1)}m
        </span>
      </Badge>
    </div>
  );
};

export { DepthIndicator };
