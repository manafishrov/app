import type { Component, JSXElement } from 'solid-js';

import { Toggle } from '@manafishrov/ui/toggle';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import { Portal } from 'solid-js/web';

import { AutoStabilizationIcon } from '@/components/icons/AutoStabilizationIcon';
import { DepthHoldIcon } from '@/components/icons/DepthHoldIcon';
import * as m from '@/paraglide/messages';
import { configStore } from '@/stores/config';
import { rovStatusStore } from '@/stores/rovStatus';
import { playConfirmHaptic } from '@/tauri/gamepad';
import { toggleAutoStabilization, toggleDepthHold } from '@/tauri/stabilization';

import { useOverlayContentVisible } from './OverlayPreview';

type StabilizationToggleProps = {
  active: boolean;
  label: string;
  onToggle: () => void;
  icon: JSXElement;
};

const handleToggleError = (): void => {
  // Silently ignore toggle errors (command failure is expected if not connected)
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
          onClick={(event: MouseEvent) => {
            if (event.currentTarget instanceof HTMLElement) {
              event.currentTarget.blur();
            }
          }}
          class='size-9 justify-center border-border/50 bg-background/50 p-0 text-muted-foreground backdrop-blur-sm hover:bg-background/60 hover:text-foreground data-pressed:border-emerald-300/30 data-pressed:bg-background/80 data-pressed:text-emerald-300'
          tabindex={-1}
        >
          <span class='inline-flex size-5 items-center justify-center'>{props.icon}</span>
        </Toggle>
      )}
    />
    <Portal>
      <TooltipPositioner>
        <TooltipContent>
          <span>{props.label}</span>
          <TooltipArrow />
        </TooltipContent>
      </TooltipPositioner>
    </Portal>
  </Tooltip>
);

const StabilizationIndicator: Component = () => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'pointer-events-auto flex flex-col gap-2' : 'hidden'}>
      <StabilizationToggle
        active={rovStatusStore.autoStabilization}
        label={m.controls_stabilization_stabilization()}
        onToggle={() => {
          playConfirmHaptic(configStore.selectedGamepadId);
          toggleAutoStabilization().catch(handleToggleError);
        }}
        icon={<AutoStabilizationIcon class='size-full' />}
      />
      <StabilizationToggle
        active={rovStatusStore.depthHold}
        label={m.controls_stabilization_depth_hold()}
        onToggle={() => {
          playConfirmHaptic(configStore.selectedGamepadId);
          toggleDepthHold().catch(handleToggleError);
        }}
        icon={<DepthHoldIcon class='size-full' />}
      />
    </div>
  );
};

export { StabilizationIndicator };
