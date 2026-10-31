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
          class='overlay-control'
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

const StabilizationIndicator: Component<{ depthHold: boolean }> = (props) => {
  const isVisible = useOverlayContentVisible();

  return (
    <div class={isVisible() ? 'overlay-surface overlay-controls pointer-events-auto' : 'hidden'}>
      <Show when={!props.depthHold}>
        <StabilizationToggle
          active={rovStatusStore.autoStabilization}
          label={m.controls_stabilization_stabilization()}
          onToggle={() => {
            playConfirmHaptic(configStore.selectedGamepadId);
            toggleAutoStabilization().catch(handleToggleError);
          }}
          icon={<AutoStabilizationIcon class='size-full' />}
        />
      </Show>
      <Show when={props.depthHold}>
        <StabilizationToggle
          active={rovStatusStore.depthHold}
          label={m.controls_stabilization_depth_hold()}
          onToggle={() => {
            playConfirmHaptic(configStore.selectedGamepadId);
            toggleDepthHold().catch(handleToggleError);
          }}
          icon={<DepthHoldIcon class='size-full' />}
        />
      </Show>
    </div>
  );
};

export { StabilizationIndicator };
