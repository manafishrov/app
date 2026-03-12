import type { Component } from 'solid-js';

import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

const StabilizationIndicator: Component = () => (
  <div class={connectionStatusStore.isConnected ? 'flex flex-col gap-2 pointer-events-auto' : 'hidden'}>
    <button
      type="button"
      data-state={rovStatusStore.autoStabilization ? 'on' : 'off'}
      onClick={() => { toggleAutoStabilization().catch(() => {}); }}
      class="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-background/50 backdrop-blur-sm border border-border/50 data-[state=on]:bg-primary/80 data-[state=on]:text-primary-foreground justify-start cursor-pointer"
    >
      <div
        class={`h-2 w-2 rounded-full mr-2 ${
          rovStatusStore.autoStabilization ? 'bg-green-400' : 'bg-destructive'
        }`}
      />
      Auto Stabilization
    </button>
    <button
      type="button"
      data-state={rovStatusStore.depthHold ? 'on' : 'off'}
      onClick={() => { toggleDepthHold().catch(() => {}); }}
      class="inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 h-8 px-3 bg-background/50 backdrop-blur-sm border border-border/50 data-[state=on]:bg-primary/80 data-[state=on]:text-primary-foreground justify-start cursor-pointer"
    >
      <div
        class={`h-2 w-2 rounded-full mr-2 ${
          rovStatusStore.depthHold ? 'bg-green-400' : 'bg-destructive'
        }`}
      />
      Depth Hold
    </button>
  </div>
);

export { StabilizationIndicator };
