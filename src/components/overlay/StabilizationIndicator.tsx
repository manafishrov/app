import type { Component } from 'solid-js';

import { Toggle } from '@manafishrov/ui/toggle';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

const StabilizationIndicator: Component = () => (
  <div
    class={connectionStatusStore.isConnected ? 'flex flex-col gap-2 pointer-events-auto' : 'hidden'}
  >
    <Toggle
      size='sm'
      variant='outline'
      pressed={rovStatusStore.autoStabilization}
      onPressedChange={() => {
        toggleAutoStabilization().catch(() => {});
      }}
      class='h-8 justify-start gap-2 bg-background/50 px-3 text-foreground backdrop-blur-sm border-border/50 hover:bg-background/60 data-pressed:bg-background/80 data-pressed:text-foreground data-pressed:border-border/70'
    >
      <div
        class={`h-2 w-2 rounded-full ${
          rovStatusStore.autoStabilization ? 'bg-green-400' : 'bg-destructive'
        }`}
      />
      Auto Stabilization
    </Toggle>
    <Toggle
      size='sm'
      variant='outline'
      pressed={rovStatusStore.depthHold}
      onPressedChange={() => {
        toggleDepthHold().catch(() => {});
      }}
      class='h-8 justify-start gap-2 bg-background/50 px-3 text-foreground backdrop-blur-sm border-border/50 hover:bg-background/60 data-pressed:bg-background/80 data-pressed:text-foreground data-pressed:border-border/70'
    >
      <div
        class={`h-2 w-2 rounded-full ${
          rovStatusStore.depthHold ? 'bg-green-400' : 'bg-destructive'
        }`}
      />
      Depth Hold
    </Toggle>
  </div>
);

export { StabilizationIndicator };
