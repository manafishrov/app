import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import RulerIcon from '~icons/material-symbols/straighten';

import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { DesiredDepthPopover } from './DesiredDepthPopover';

const BASE_WIDTH_REM = 7;
const SCALE_MULTIPLIER = 2;

const DepthIndicator: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_WIDTH_REM + (configStore.overlayScale - 1) * SCALE_MULTIPLIER}rem`,
  );

  return (
    <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-1' : 'hidden'}>
      <Badge
        variant='secondary'
        class='h-auto min-h-5 items-center justify-between gap-3 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
        style={{ 'min-width': badgeWidth() }}
      >
        <div class='flex shrink-0 items-center text-muted-foreground'>
          <RulerIcon class='mr-1 size-[1em] rotate-90' />
          <span class='text-[10px] tracking-wider uppercase'>
            {m.overlay_depth_current_short()}
          </span>
        </div>
        <span class='shrink-0 font-mono tabular-nums'>{rovTelemetryStore.depth.toFixed(1)}m</span>
      </Badge>
      <DesiredDepthPopover>
        <Badge
          variant='secondary'
          class='h-auto min-h-5 items-center justify-between gap-3 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm hover:bg-background/80 transition-colors'
          style={{ 'min-width': badgeWidth() }}
        >
          <div class='flex shrink-0 items-center text-muted-foreground'>
            <RulerIcon class='mr-1 size-[1em] rotate-90 opacity-50' />
            <span class='text-[10px] tracking-wider uppercase'>
              {m.overlay_depth_target_short()}
            </span>
          </div>
          <span class='shrink-0 font-mono text-muted-foreground tabular-nums'>
            {rovTelemetryStore.desiredDepth.toFixed(1)}m
          </span>
        </Badge>
      </DesiredDepthPopover>
    </div>
  );
};

export { DepthIndicator };
