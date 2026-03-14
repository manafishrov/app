import { Badge } from '@manafishrov/ui/badge';
import { type Component, For } from 'solid-js';

import { ThrusterRpm } from '@/components/ThrusterRpm';
import { configStore } from '@/stores/config';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovTelemetryStore } from '@/stores/rovTelemetry';

const ThrusterItem: Component<{ index: number }> = (props) => (
  <Badge
    variant='secondary'
    class='bg-background/50 backdrop-blur-sm border-border/50 items-center justify-end gap-1 min-w-[6.5rem] lg:min-w-28 whitespace-nowrap'
  >
    <div class='flex shrink-0 items-center gap-1 tabular-nums font-mono'>
      <ThrusterRpm rpm={rovTelemetryStore.thrusterRpms[props.index] ?? 0} />
    </div>
    <span class='w-4 shrink-0 text-right'>T{props.index + 1}</span>
  </Badge>
);

const ThrusterRpmOverlay: Component = () => (
  <div
    class={
      connectionStatusStore.isConnected && configStore.thrusterRpmOverlay
        ? 'flex flex-col items-end gap-2'
        : 'hidden'
    }
  >
    <For
      each={Array.from(
        { length: rovTelemetryStore.thrusterRpms.length },
        (_, thrusterIndex) => thrusterIndex,
      )}
    >
      {(index) => <ThrusterItem index={index} />}
    </For>
  </div>
);

export { ThrusterRpmOverlay };
