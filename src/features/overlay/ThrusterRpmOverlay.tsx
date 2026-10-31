import type { Component } from 'solid-js';

import { ThrusterRpm } from '@/components/ThrusterRpm';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const ThrusterRpmOverlay: Component = () => (
  <div
    class={
      connectionStatusStore.isConnected && configStore.thrusterRpmOverlay
        ? 'flex flex-col items-end gap-2'
        : 'hidden'
    }
  >
    <Index each={rovTelemetryStore.thrusterRpms}>
      {(rpm, index) => (
        <span class='inline-flex min-h-5 w-[6rem] min-w-0 shrink-0 items-center rounded-4xl border border-border/50 bg-background/50 px-2 py-1 text-xs whitespace-nowrap text-secondary-foreground backdrop-blur-sm'>
          <span class='ml-auto inline-flex items-center gap-1 font-mono tabular-nums'>
            <ThrusterRpm rpm={rpm()} />
            <span class='shrink-0'>T{index + 1}</span>
          </span>
        </span>
      )}
    </Index>
  </div>
);

export { ThrusterRpmOverlay };
