import type { Component } from 'solid-js';

import { Badge } from '@manafishrov/ui/badge';

import { ThrusterRpm } from '@/components/ThrusterRpm';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const BASE_WIDTH_REM = 6.5;
const SCALE_MULTIPLIER = 2;

const ThrusterRpmOverlay: Component = () => {
  const badgeWidth = createMemo(
    () => `${BASE_WIDTH_REM + (configStore.overlayScale - 1) * SCALE_MULTIPLIER}rem`,
  );

  return (
    <div
      class={
        connectionStatusStore.isConnected && configStore.thrusterRpmOverlay
          ? 'flex flex-col items-end gap-2'
          : 'hidden'
      }
    >
      <Index each={rovTelemetryStore.thrusterRpms}>
        {(rpm, index) => (
          <Badge
            variant='secondary'
            class='h-auto min-h-5 items-center justify-end gap-1 border-border/50 bg-background/50 py-1 whitespace-nowrap backdrop-blur-sm'
            style={{ 'min-width': badgeWidth() }}
          >
            <div class='flex shrink-0 items-center gap-1 font-mono tabular-nums'>
              <ThrusterRpm rpm={rpm()} />
            </div>
            <span class='min-w-[2.5ch] shrink-0 text-right'>T{index + 1}</span>
          </Badge>
        )}
      </Index>
    </div>
  );
};

export { ThrusterRpmOverlay };
