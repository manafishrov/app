import type { Component, JSX } from 'solid-js';

import { Toggle } from '@manafishrov/ui/toggle';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';

import { AutoStabilizationIcon } from '@/components/icons/AutoStabilizationIcon';
import { DepthHoldIcon } from '@/components/icons/DepthHoldIcon';
import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

type StabilizationToggleProps = {
  active: boolean;
  label: string;
  onToggle: () => void;
  children: JSX.Element;
};

const StabilizationToggle: Component<StabilizationToggleProps> = (props) => (
  <Tooltip positioning={{ placement: 'right' }}>
    <TooltipTrigger
      asChild={(tooltipProps) => (
        <Toggle
          {...tooltipProps()}
          size='sm'
          variant='outline'
          pressed={props.active}
          aria-label={props.label}
          onPressedChange={() => {
            props.onToggle();
          }}
          class='size-9 justify-center bg-background/50 p-0 text-muted-foreground backdrop-blur-sm border-border/50 hover:bg-background/60 hover:text-foreground data-pressed:bg-background/80 data-pressed:text-emerald-300 data-pressed:border-emerald-300/30'
        >
          {props.children}
        </Toggle>
      )}
    />
    <TooltipPositioner>
      <TooltipContent>
        <span>{props.label}</span>
        <TooltipArrow />
      </TooltipContent>
    </TooltipPositioner>
  </Tooltip>
);

const StabilizationIndicator: Component = () => (
  <div
    class={connectionStatusStore.isConnected ? 'flex flex-col gap-2 pointer-events-auto' : 'hidden'}
  >
    <StabilizationToggle
      active={rovStatusStore.autoStabilization}
      label={m.controls_stabilization_stabilization()}
      onToggle={() => {
        toggleAutoStabilization().catch(() => {});
      }}
    >
      <AutoStabilizationIcon class='size-5' />
    </StabilizationToggle>
    <StabilizationToggle
      active={rovStatusStore.depthHold}
      label={m.controls_stabilization_depth_hold()}
      onToggle={() => {
        toggleDepthHold().catch(() => {});
      }}
    >
      <DepthHoldIcon class='size-5' />
    </StabilizationToggle>
  </div>
);

export { StabilizationIndicator };
