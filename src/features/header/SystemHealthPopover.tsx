import type { JSXElement } from 'solid-js';

import { Button } from '@manafishrov/ui/button';
import { Kbd, KbdGroup } from '@manafishrov/ui/kbd';
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverPositioner,
  PopoverTrigger,
} from '@manafishrov/ui/popover';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipPositioner,
  TooltipTrigger,
} from '@manafishrov/ui/tooltip';
import HeartPulseIcon from '~icons/material-symbols/monitor-heart';

import * as m from '@/paraglide/messages';
import { connectionStatusStore } from '@/stores/connectionStatus';
import { rovStatusStore } from '@/stores/rovStatus';

const HealthItem = (props: { label: string; healthy: boolean }): JSXElement => (
  <div class='flex items-center justify-between gap-3'>
    <span class='text-xs text-muted-foreground'>{props.label}</span>
    <div class={`h-2 w-2 rounded-full ${props.healthy ? 'bg-green-500' : 'bg-destructive'}`} />
  </div>
);

const SystemHealthPopoverContent = (): JSXElement => (
  <PopoverPositioner>
    <PopoverContent class='w-56'>
      <PopoverArrow />
      <div class='space-y-3'>
        <div class='text-sm font-medium'>{m.controls_system_health_title()}</div>
        <div class='space-y-2'>
          <HealthItem
            label={m.controls_system_health_imu()}
            healthy={rovStatusStore.health.imuHealthy}
          />
          <HealthItem
            label={m.controls_system_health_pressure_sensor()}
            healthy={rovStatusStore.health.pressureSensorHealthy}
          />
          <HealthItem
            label={m.controls_system_health_microcontroller()}
            healthy={rovStatusStore.health.microcontrollerHealthy}
          />
        </div>
      </div>
    </PopoverContent>
  </PopoverPositioner>
);

const SystemHealthTooltipContent = (props: { isMac: boolean }): JSXElement => (
  <TooltipContent>
    <div class='flex items-center gap-2'>
      <span>{m.controls_system_health_title()}</span>
      <KbdGroup>
        <Kbd>{props.isMac ? '⌘' : 'Ctrl'}</Kbd>
        <Kbd>⇧</Kbd>
        <Kbd>H</Kbd>
      </KbdGroup>
    </div>
    <TooltipArrow />
  </TooltipContent>
);

const useSystemHealthKeybind = (
  setPopoverOpen: (update: (prev: boolean) => boolean) => void,
): void => {
  onMount(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setPopoverOpen((prev) => !prev);
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    onCleanup(() => {
      globalThis.removeEventListener('keydown', handleKeyDown);
    });
  });
};

const SystemHealthPopover = (props: { isMac: boolean }): JSXElement => {
  const [popoverOpen, setPopoverOpen] = createSignal(false);

  useSystemHealthKeybind(setPopoverOpen);

  return (
    <Show when={connectionStatusStore.isConnected}>
      <Popover
        open={popoverOpen()}
        positioning={{ placement: 'bottom' }}
        onOpenChange={(details) => setPopoverOpen(details.open)}
      >
        <Tooltip positioning={{ placement: 'bottom' }} disabled={popoverOpen()}>
          <TooltipTrigger
            asChild={(tooltipProps) => (
              <span {...tooltipProps()}>
                <PopoverTrigger
                  asChild={(popoverProps) => (
                    <Button
                      {...popoverProps()}
                      tabIndex={-1}
                      size='icon-xs'
                      variant='outline'
                      aria-label={m.aria_labels_system_health()}
                    >
                      <HeartPulseIcon aria-hidden='true' />
                    </Button>
                  )}
                />
              </span>
            )}
          />
          <TooltipPositioner>
            <SystemHealthTooltipContent isMac={props.isMac} />
          </TooltipPositioner>
        </Tooltip>
        <SystemHealthPopoverContent />
      </Popover>
    </Show>
  );
};

export { SystemHealthPopover };
