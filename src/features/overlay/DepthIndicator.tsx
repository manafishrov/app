import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';
import RulerIcon from '~icons/material-symbols/straighten';

import * as m from '@/paraglide/messages';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

import { DesiredDepthPopover } from './DesiredDepthPopover';
import { useOverlayContentVisible } from './OverlayPreview';

const DepthIndicator: Component<{ target: boolean }> = (props) => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'overlay-surface overlay-readings' : 'hidden'}>
      <Show when={!props.target}>
        <Badge variant='secondary' class='overlay-reading'>
          <div class='flex shrink-0 items-center text-muted-foreground'>
            <RulerIcon class='mr-1 size-[1em] rotate-90' />
            <span class='text-[10px] tracking-wider uppercase'>
              {m.overlay_depth_current_short()}
            </span>
          </div>
          <span class='overlay-value'>{rovTelemetryStore.depth.toFixed(1)}m</span>
        </Badge>
      </Show>
      <Show when={props.target}>
        <DesiredDepthPopover class='overlay-reading-action'>
          <Badge variant='secondary' class='overlay-reading'>
            <div class='flex shrink-0 items-center text-muted-foreground'>
              <RulerIcon class='mr-1 size-[1em] rotate-90 opacity-50' />
              <span class='text-[10px] tracking-wider uppercase'>
                {m.overlay_depth_target_short()}
              </span>
            </div>
            <span class='overlay-value text-muted-foreground'>
              {rovTelemetryStore.desiredDepth.toFixed(1)}m
            </span>
          </Badge>
        </DesiredDepthPopover>
      </Show>
    </div>
  );
};

export { DepthIndicator };
